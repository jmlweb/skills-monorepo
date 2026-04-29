---
name: condense-learnings
description: Condense the learnings backlog: dedupe, normalize tags, archive stale entries, then caveman-compress the body of every remaining active learning. Validated against load-bearing invariants. Use when the user says "condense learnings", "clean up learnings", "deduplicate learnings", or "organize learnings".
allowed-tools: [Bash, Read]
model: sonnet
effort: medium
---

# Condense Learnings

Two-pass shrink of `learnings/`:

1. **Curation** — archive duplicates / stale entries, normalize tags.
2. **Caveman compression** — rewrite the body of each remaining active learning terse, validated against invariants. Sets `compressed: true` on success.

## Workflow

### 1. Pass 1 — curation

Load all active learnings:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-list --json true
```

If empty or fewer than 2: skip Pass 1, go straight to Pass 2.

Read each learning's `id`, `title`, `tags`, `created`, and `body`. Identify:

- **Duplicates** — same root insight. Keep the one with fuller body or clearer title. Archive the other. Optionally enrich the winner from the loser's content.
- **Stale / superseded** — was valid once, now wrong, trivially obvious, or fully covered elsewhere. Archive.
- **Tag normalization** — `error-handling` vs `errors` vs `error_handling` → pick canonical, update all.
- **Keep** — non-obvious, still valid, actionable. When in doubt, keep.

Apply each action:

```bash
# Archive a learning (duplicate loser or stale entry):
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-move {{ID}} --to archived

# Update the winner when merging (add missing insights from the loser):
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --body -
{{MERGED_BODY}}
BODY

# Normalize tags:
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --tags "{{canonical-tag1}},{{canonical-tag2}}"
```

Rebuild the index:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild --type learnings
```

### 2. Pass 2 — caveman compress each remaining active learning

Reload the active list (curation may have changed it):

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-list --json true
```

For each learning:

1. **Read** the file at `.backlog/learnings/{{id}}-{{slug}}/index.md` with the `Read` tool. Skip if frontmatter has `compressed: true`.
2. **Rewrite the body** following the caveman rules below. Frontmatter (`---\n…\n---`) stays out of the rewrite — only the body below it.
3. **Pipe** to `learning-compress`:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-compress {{ID}} --body - --json true
{{COMPRESSED_BODY}}
BODY
```

Exit code `0` = success, `2` = invariant failure (JSON `errors` lists missing tokens). File untouched on failure.

4. **On invariant failure** — retry **once** with diagnostics in your reasoning (e.g. "validator says missing LRN-014 — preserve it byte-exact"). Second failure → log + skip. Do not delete or alter the file.

### 3. Caveman compression rules (Pass 2 body rewrite)

**Drop**

- Articles: `a`, `an`, `the`
- Filler: `just`, `really`, `basically`, `actually`, `simply`, `essentially`, `generally`
- Pleasantries: `sure`, `certainly`, `of course`, `happy to`, `I'd recommend`
- Hedging: `it might be worth`, `you could consider`, `it would be good to`
- Connective fluff: `however`, `furthermore`, `additionally`, `in addition`
- Redundant phrasing: `in order to` → `to`, `make sure to` → `ensure`
- "you should", "remember to" — state the rule directly

**Preserve EXACTLY (validator enforces — byte-exact)**

- Fenced code blocks (```` ``` ````) — every byte
- Inline code (`` `…` ``)
- URLs (`https://…`)
- IDs: `TSK-\d{3,}`, `LRN-\d{3,}`, `PLN-\d{3,}`, `RPT-\d{3,}`
- Dates: `YYYY-MM-DD`
- Version numbers: `vX.Y.Z`
- All markdown headings (same set, same order, exact heading text)

**Compress**

- Short synonyms: `big` not `extensive`, `fix` not `implement a solution for`, `use` not `utilize`
- Fragments OK
- Merge bullets that say the same thing
- Keep one example where multiple show the same pattern
- For learnings with `**Why:**` / `**How to apply:**` blocks: keep the labels, compress the prose after them

**Pattern**

> Original: "When you are writing tests for the database layer, you should always make sure to use a real database connection rather than mocking it, because we got burned last quarter when mocked tests passed but the production migration failed."
>
> Compressed: "DB-layer tests must use real connection, not mock. Past incident 2025-Q3: mocks passed, prod migration failed."

### 4. Report Summary

```
## Learnings Condensed

**Pass 1 — curation**
- Archived ({{N}}): LRN-XXX: {{title}} — {{reason}}
- Merged into ({{N}} winners updated): LRN-XXX ← absorbed LRN-YYY
- Tags normalized ({{N}}): `errors` → `error-handling` on LRN-XXX, LRN-YYY

**Pass 2 — caveman compress** ({{N}} touched):
- LRN-XXX: {{title}} — saved {{bytes}} bytes

**Skipped — already compressed** ({{N}})
**Failed validation** ({{N}}):
- LRN-XXX: {{first error}}

Total bytes saved: {{TOTAL}}
```

If nothing changed: `All {{N}} learnings are already curated and compressed.`

## Notes

- Both passes are idempotent. Curation can run repeatedly without re-archiving the same entries; `compressed: true` blocks re-compress.
- Validation rejects rewrites that drop load-bearing tokens or reorder headings. Original preserved on failure.
- Pass 1 is the right place to reshape semantics; Pass 2 only compresses prose, never paraphrases away meaning.
