---
name: condense-tasks
description: Condense completed tasks in the backlog by stripping scratchpad Notes and pruning middle Progress Log entries. Use when the user says "condense tasks", "clean up done tasks", "trim completed backlog", or wants to shrink the size of complete task files.
allowed-tools: [Bash]
model: haiku
effort: low
---

# Condense Tasks

Reduce noise in completed tasks: drop Notes section content, keep only first and last Progress Log entries, leave Description / Acceptance Criteria / Learnings untouched. Idempotent (sets `condensed: true` in frontmatter).

## What gets condensed

| Section | Action |
|---------|--------|
| Frontmatter | Untouched (sets `condensed: true`) |
| Title | Untouched |
| Description | Untouched |
| Acceptance Criteria | Untouched (final shipped state preserved) |
| Notes | Content dropped, heading preserved |
| Learnings | Untouched (LRN pointers stay) |
| Progress Log | First + last entry kept, middle dropped, `Condensed` marker appended |

## Workflow

### 1. Run condense across all complete tasks

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-condense --all --json true
```

If output is `[]`, output: "No completed tasks to condense." and stop.

### 2. Single-task variant (when user names a specific task)

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-condense {{ID}} --json true
```

### 3. Report Summary

Parse the JSON result. For each entry:

- `condensed: true` → counts toward "condensed" tally with bytes saved (`bytesBefore - bytesAfter`)
- `condensed: false` with `skippedReason: "already condensed"` → counts toward "already condensed"
- `condensed: false` with `skippedReason: "already lean"` → counts toward "already lean"

Print:

```
## Tasks Condensed

**Condensed** ({{N}}):
- TSK-XXX: {{title}} — saved {{bytes}} bytes

**Skipped — already condensed** ({{N}})
**Skipped — already lean** ({{N}})

Total bytes saved: {{TOTAL}}
```

If nothing was condensed, output: "All {{N}} completed tasks are already lean or condensed."

## Notes

- Only operates on tasks in `tasks/complete/`. Pending / active / blocked tasks are not touched.
- Safe to re-run: tasks already marked `condensed: true` are skipped.
- Acceptance Criteria are preserved verbatim — they prove what shipped.
- Source-of-truth for completion timestamps lives in frontmatter (`completed:` field), so dropping the `Completed` log line is non-destructive.
