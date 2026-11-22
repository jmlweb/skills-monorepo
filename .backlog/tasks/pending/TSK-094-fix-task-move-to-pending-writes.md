---
id: TSK-094
title: Fix: task-move --to pending writes status pending on a blocked task that keeps blocked-by
status: pending
priority: P4
tags: []
created: 2026-11-22
source: report/RPT-038
depends-on: []
---

# Fix: task-move --to pending writes status pending on a blocked task that keeps blocked-by

## Description

See RPT-038. `task-move.ts:22` keeps `blocked` only for `--to active`; moving a blocked task to pending writes `status: pending` with `blocked-by` intact, and `task-doctor` then rewrites it. Residual gap of TSK-073.

## Acceptance Criteria

- [ ] task-move derives the written status with taskStatusOf(to, frontmatter), so a blocked task moved to pending keeps status blocked
- [ ] task-doctor reports no fix after task-move --to pending on a blocked task
- [ ] A test covers the blocked-to-pending move and asserts status and blocked-by in the file

## Notes

## Learnings

## Progress Log

- [2026-11-22] Created