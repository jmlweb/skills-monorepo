---
id: TSK-074
title: Fix: task-doctor plain output prints [object Object] for each fixed task
status: complete
priority: P4
tags: [flowstate, cli]
created: 2026-11-05
source: report/RPT-026
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: task-doctor plain output prints [object Object] for each fixed task

## Description

See RPT-026. `output()` stringifies nested arrays of objects as `[object Object]`; `task-doctor` is the documented plain-mode command that hits it.

## Acceptance Criteria

- [x] task-doctor without --json prints one tab-separated row per fix with id, folder, statusBefore and statusAfter
- [x] output() in plugins/flowstate/src/bin/flowstate.ts never prints [object Object] for nested arrays of objects
- [x] A test covers task-doctor plain output with at least one fix

## Notes

## Learnings

- LRN-062: Compare CLI-printed paths by suffix in integration tests: the CLI prints realpath
## Progress Log

- [2026-11-05] Created
- [2026-11-07] Started
- [2026-11-07] Merged worktree branch into main; flowstate 397 tests pass; dist clean.
- [2026-11-07] Completed