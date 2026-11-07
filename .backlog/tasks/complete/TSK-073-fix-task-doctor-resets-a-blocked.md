---
id: TSK-073
title: Fix: task-doctor resets a blocked task in tasks/pending to pending and the block disappears
status: complete
priority: P2
tags: [flowstate, cli, store]
created: 2026-11-05
source: report/RPT-025
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: task-doctor resets a blocked task in tasks/pending to pending and the block disappears

## Description

See RPT-025. `task-block` leaves a blocked pending task in `tasks/pending/` (LRN-040), but `task-doctor.ts:80` only treats `active/` as able to hold blocked tasks and rewrites the status to `pending`. List, stats and index have the same folder-only view. Pick one model (move on block, or recognise pending + blocked-by everywhere) and apply it to all readers.

## Acceptance Criteria

- [x] task-doctor keeps status blocked for a task in tasks/pending that has blocked-by
- [x] task-list --status blocked lists blocked tasks from tasks/pending as well as tasks/active
- [x] stats and tasks/index.md count a blocked pending task as blocked
- [x] A test blocks a pending task, runs task-doctor, and asserts status and blocked-by are unchanged

## Notes

## Learnings

## Progress Log

- [2026-11-05] Created
- [2026-11-07] Raised P3 to P2: silently corrupts backlog state, approved by the user 2026-11-07
- [2026-11-07] Started
- [2026-11-07] Merged worktree branch into main; flowstate 397 tests pass; dist clean.
- [2026-11-07] Completed
- [2026-11-07] Model chosen: recognise pending plus blocked-by everywhere, no file moves. One rule taskStatusOf(bucket, frontmatter) in core/store.ts used by task-doctor, task-list, stats and index-rebuild; task-doctor synonym table removed as dead code.