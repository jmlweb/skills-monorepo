---
id: RPT-012
title: A pipe or newline in an entity title corrupts frontmatter and index tables
type: bug
severity: medium
status: triaged
created: 2026-10-22
triaged: 2026-10-22
task-id: TSK-060
---

## Description

The CLI writes titles verbatim into YAML frontmatter and into markdown table rows, with no validation or escaping.

- `plugins/flowstate/src/core/frontmatter.ts:61-67`: `serializeValue` returns `String(value)`, so a newline in a title splits the frontmatter value across lines.
- `plugins/flowstate/src/commands/task-create.ts:92`: the Pending Tasks row interpolates `${input.title}` raw.
- `plugins/flowstate/src/commands/index-rebuild.ts:90,103,161`: task and learning index rows interpolate titles raw, so a rebuild reproduces the damage.

## Reproduction

In a temp git repo, after `flowstate setup` (built CLI from `plugins/flowstate/dist`):

1. `task-create --title 'pipe | title' --priority P2` writes this row to `tasks/index.md`:
   `| TSK-001 | pipe | title | P2 |  | 2026-10-22 |`
   The table gains a column: Priority shows `title`, Tags shows `P2`.
2. `learning-create --title 'l | m' --tags a` writes `| LRN-001 | l | m | a | active | 2026-10-22 |`. The same column shift.
3. `task-create --title $'line1\nline2' --priority P3` writes frontmatter `title: line1` plus a stray `line2` line. `task-list --json true` then reports the title as `"line1"`; the rest is lost silently. The index row also breaks across two lines.

`scripts/check-backlog-integrity.mjs` still reports "consistent" afterwards, because the rebuild emits the same broken rows. The CI gate does not catch it.

## Expected

Either reject titles that hold a newline (actionable error at the CLI boundary) and escape `|` as `\|` in table rows, or reject both.
