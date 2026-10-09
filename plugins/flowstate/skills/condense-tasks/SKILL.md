---
name: condense-tasks
description: Shrinks completed task files so the done backlog stays cheap to read.
disable-model-invocation: true
allowed-tools: [Bash, Read]
model: sonnet
effort: medium
---

# Condense Tasks

Two passes over `tasks/complete/`:

1. **Structural** — drop Notes content, keep first + last Progress Log entries (idempotent, sets `condensed: true`).
2. **Caveman compression** — rewrite remaining prose terse. Sets `compressed: true` on success.

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

Done when: the CLI JSON lists touched and skipped tasks.

### 2. Pass 2 — caveman compress

List complete tasks and their paths:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status complete --json true
```

For each task:

1. **Read** the file with the `Read` tool. Skip if frontmatter has `compressed: true`.
2. **Rewrite the body** following the caveman rules below. Rewrite only the body below the frontmatter.
3. **Pipe** the new body to `task-compress`:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-compress {{ID}} --body - --json true
{{COMPRESSED_BODY}}
BODY
```

Exit code `0` = success, `2` = invariant failure (JSON `errors` field lists each missing token / modified section). File is left untouched on failure.

4. **On invariant failure** — re-read the original and retry **once**, using the diagnostics (e.g. "missing URL X"). On a second failure, log the task ID + errors and move on; the file stays as it was.

Done when: every uncompressed complete task has exit 0, or a logged second failure.

### 3. Caveman compression rules

Before the first rewrite, read `${CLAUDE_PLUGIN_ROOT}/shared/caveman-compression.md`; it lists what to drop, what must stay byte-exact, and an example.

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
