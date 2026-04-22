---
id: TSK-009
title: Fix: block-task skill uses task-update for status change instead of task-move
status: complete
priority: P3
tags: []
created: 2026-04-10
source: report/RPT-004
depends-on: []
started: 2026-04-10
completed: 2026-04-10
---

# Fix: block-task skill uses task-update for status change instead of task-move

## Description

The block-task skill prompt uses task-update --set "status=blocked,blocked-by=REASON" which only updates frontmatter without moving the file or rebuilding the index. This leaves tasks in an inconsistent state.

Fix approach:
1. Update block-task skill to use a proper blocking mechanism (task-move or dedicated block command)
2. Make task-update reject "status" as a settable key with a clear error pointing to task-move
3. Audit next-task skill to confirm it delegates to start-task rather than calling task-update directly

See RPT-004 for full analysis.


## Acceptance Criteria

- [x] block-task skill uses proper mechanism instead of task-update --set status=blocked
- [x] task-update rejects status as a key with error pointing to task-move
- [x] Verify next-task skill does not directly change status via task-update

## Notes

## Learnings

## Progress Log

- [2026-04-10] Created
- [2026-04-10] Started
- [2026-04-10] Completed