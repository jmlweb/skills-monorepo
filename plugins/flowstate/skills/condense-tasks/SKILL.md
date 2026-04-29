---
name: condense-tasks
description: Condense completed tasks: structural trim (drop Notes scratchpad, prune middle Progress Log) plus caveman-style prose compression (drop articles, filler, hedging) on remaining body. Validated against load-bearing invariants. Use when the user says "condense tasks", "clean up done tasks", "trim completed backlog", or wants to shrink the size of complete task files.
allowed-tools: [Bash, Read]
model: sonnet
effort: medium
---

# Condense Tasks

Two-pass shrink of `tasks/complete/`:

1. **Structural** — drop Notes content, keep first + last Progress Log entries (idempotent, sets `condensed: true`).
2. **Caveman compression** — rewrite remaining prose terse, validated against invariants. Sets `compressed: true` on success.

## What gets touched

| Section | Pass 1 (condense) | Pass 2 (compress) |
|---------|-------------------|-------------------|
| Frontmatter | Untouched | Untouched (sets `compressed: true`) |
| Title | Untouched | Untouched (heading text byte-exact) |
| Description | Untouched | Caveman-rewrite |
| Acceptance Criteria | Untouched | Untouched (validator enforces byte-exact) |
| Notes | Content dropped | n/a |
| Learnings | Untouched | Caveman-rewrite (LRN-XXX IDs preserved) |
| Progress Log | First + last kept | Caveman-rewrite each remaining line |

## Workflow

### 1. Pass 1 — structural condense

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-condense --all --json true
```

Single-task variant when the user names one:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-condense {{ID}} --json true
```

### 2. Pass 2 — caveman compress

List complete tasks and their paths:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status complete --json true
```

For each task:

1. **Read** the file with the `Read` tool. Skip if frontmatter has `compressed: true`.
2. **Rewrite the body** following the caveman rules below. Keep the frontmatter line block (`---\n...\n---`) out of the rewrite — only the body below it.
3. **Pipe** the new body to `task-compress`:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-compress {{ID}} --body - --json true
{{COMPRESSED_BODY}}
BODY
```

Exit code `0` = success, `2` = invariant failure (JSON `errors` field lists each missing token / modified section). File is left untouched on failure.

4. **On invariant failure** — re-read the original, retry **once** with the failure diagnostics included in your reasoning (e.g. "validator says missing URL X — preserve it byte-exact this time"). On second failure, log the task ID + errors and move on. Do not delete or alter the file.

### 3. Caveman compression rules (Pass 2 body rewrite)

**Drop**

- Articles: `a`, `an`, `the`
- Filler: `just`, `really`, `basically`, `actually`, `simply`, `essentially`, `generally`
- Pleasantries: `sure`, `certainly`, `of course`, `happy to`, `I'd recommend`
- Hedging: `it might be worth`, `you could consider`, `it would be good to`
- Connective fluff: `however`, `furthermore`, `additionally`, `in addition`
- Redundant phrasing: `in order to` → `to`, `make sure to` → `ensure`, `the reason is because` → `because`
- "you should", "remember to", "we need to" — state the action directly

**Preserve EXACTLY (validator enforces — byte-exact)**

- Fenced code blocks (```` ``` ````) — every byte, including blank lines and comments inside
- Inline code (`` `…` ``)
- URLs (`https://…`)
- IDs: `TSK-\d{3,}`, `LRN-\d{3,}`, `PLN-\d{3,}`, `RPT-\d{3,}`
- Dates: `YYYY-MM-DD`
- Version numbers: `vX.Y.Z`
- All markdown headings (same set, same order, exact heading text)
- The entire `## Acceptance Criteria` section — do not touch

**Compress**

- Short synonyms: `big` not `extensive`, `fix` not `implement a solution for`, `use` not `utilize`
- Fragments OK: `Run tests before push.` not `You should always make sure to run the tests before pushing.`
- Merge bullets that say the same thing differently
- One example wins where multiple show the same pattern

**Pattern**

> Original: "We were finally able to track down the root cause of the bug, which turned out to be in the auth middleware where the token expiry check was using `<` instead of `<=`."
>
> Compressed: "Root cause: auth middleware token expiry check used `<` instead of `<=`."

### 4. Report Summary

Parse the JSON results from both passes. Print:

```
## Tasks Condensed

**Pass 1 — structural** ({{N}} touched):
- TSK-XXX: {{title}} — saved {{bytes}} bytes

**Pass 2 — caveman compress** ({{N}} touched):
- TSK-XXX: {{title}} — saved {{bytes}} bytes

**Skipped — already compressed** ({{N}})
**Skipped — already lean** ({{N}})
**Failed validation** ({{N}}):
- TSK-XXX: {{first error}}

Total bytes saved: {{TOTAL}}
```

If nothing was touched: `All {{N}} completed tasks are already lean or compressed.`

## Notes

- Only operates on tasks in `tasks/complete/`. Pending / active / blocked tasks are not touched.
- Both passes are idempotent and independent: `condensed: true` blocks re-condense, `compressed: true` blocks re-compress.
- Validation rejects any rewrite that drops a load-bearing token, reorders headings, or modifies Acceptance Criteria. The original file is preserved on failure.
- Source-of-truth for completion timestamps lives in frontmatter (`completed:` field).
