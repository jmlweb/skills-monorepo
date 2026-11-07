---
id: TSK-060
title: Fix: A pipe or newline in an entity title corrupts frontmatter and index tables
status: complete
priority: P3
tags: [flowstate, cli, index]
created: 2026-10-22
source: report/RPT-012
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: A pipe or newline in an entity title corrupts frontmatter and index tables

## Description

### Context

From RPT-012. Titles go verbatim into frontmatter (`plugins/flowstate/src/core/frontmatter.ts:61-67`) and index rows (`plugins/flowstate/src/core/file-store.ts:102`, `plugins/flowstate/src/commands/index-rebuild.ts:90,103,161`). A `|` shifts table columns; a newline truncates the stored title to its first line and breaks the row.

### Approach

Validate titles at the CLI boundary (reject newlines). Escape `|` as `\|` in one shared row helper used by task-create and index-rebuild, so incremental writes and rebuilds stay byte-identical for `pnpm backlog:check`.

## Acceptance Criteria

- [x] Every *-create and learning-update rejects a title holding a newline with an actionable error and exit 1
- [x] A pipe in a title is escaped in task-create and index-rebuild table rows so each row keeps its column count
- [x] Regression tests cover a pipe and a newline title for task-create, learning-create and index-rebuild
- [ ] dist rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-22] Created
- [2026-11-07] Line reference refreshed: the task-create row writer moved to core/file-store.ts:102 in the BacklogStore extraction
- [2026-11-07] Started
- [2026-11-07] Merged worktree branch into main; flowstate 397 tests pass; dist clean.
- [2026-11-07] Completed