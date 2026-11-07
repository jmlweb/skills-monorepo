---
id: TSK-074
title: Fix: task-doctor plain output prints [object Object] for each fixed task
status: pending
priority: P4
tags: [flowstate, cli]
created: 2026-11-05
source: report/RPT-026
depends-on: []
---

# Fix: task-doctor plain output prints [object Object] for each fixed task

## Description

See RPT-026. `output()` stringifies nested arrays of objects as `[object Object]`; `task-doctor` is the documented plain-mode command that hits it.

## Acceptance Criteria

- [ ] task-doctor without --json prints one tab-separated row per fix with id, folder, statusBefore and statusAfter
- [ ] output() in plugins/flowstate/src/bin/flowstate.ts never prints [object Object] for nested arrays of objects
- [ ] A test covers task-doctor plain output with at least one fix

## Notes

## Learnings

## Progress Log

- [2026-11-05] Created