---
id: TSK-064
title: Fix: task-update --set writes unvalidated values, including id and priority
status: pending
priority: P3
tags: []
created: 2026-10-26
source: report/RPT-016
depends-on: []
---

# Fix: task-update --set writes unvalidated values, including id and priority

## Description

From RPT-016. `plugins/flowstate/src/commands/task-update.ts:46` rejects only `status` and `blocked-by`; lines 65-66 write every other key as-is. `--set id=TSK-003` on TSK-002 yields two TSK-003 rows in `task-list`; `--set priority=P9` is accepted while `task-create --priority P9` is rejected.

## Acceptance Criteria

- [ ] task-update --set id=... exits 1 and leaves the task unchanged
- [ ] task-update --set priority=<value> runs the same validatePriority check as task-create
- [ ] Regression tests cover a rejected id and an invalid priority; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-10-26] Created