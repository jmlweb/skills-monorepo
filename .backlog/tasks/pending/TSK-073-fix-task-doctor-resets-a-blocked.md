---
id: TSK-073
title: Fix: task-doctor resets a blocked task in tasks/pending to pending and the block disappears
status: pending
priority: P3
tags: []
created: 2026-11-05
source: report/RPT-025
depends-on: []
---

# Fix: task-doctor resets a blocked task in tasks/pending to pending and the block disappears

## Description

See RPT-025. `task-block` leaves a blocked pending task in `tasks/pending/` (LRN-040), but `task-doctor.ts:80` only treats `active/` as able to hold blocked tasks and rewrites the status to `pending`. List, stats and index have the same folder-only view. Pick one model (move on block, or recognise pending + blocked-by everywhere) and apply it to all readers.

## Acceptance Criteria

- [ ] task-doctor keeps status blocked for a task in tasks/pending that has blocked-by
- [ ] task-list --status blocked lists blocked tasks from tasks/pending as well as tasks/active
- [ ] stats and tasks/index.md count a blocked pending task as blocked
- [ ] A test blocks a pending task, runs task-doctor, and asserts status and blocked-by are unchanged

## Notes

## Learnings

## Progress Log

- [2026-11-05] Created