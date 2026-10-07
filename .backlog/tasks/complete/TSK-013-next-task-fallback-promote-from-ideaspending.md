---
id: TSK-013
title: next-task fallback: promote from ideas/pending when backlog has no pending tasks
status: complete
priority: P3
tags: [flowstate, skill, ux]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
condensed: true
---

# next-task fallback: promote from ideas/pending when backlog has no pending tasks

## Description

When pending/ empty, next-task output not actionable. Skill (or new CLI command next-from-ideas) should surface ideas/pending as candidates and offer promotion to task.

## Acceptance Criteria

- [x] next-task skill detects empty pending and inspects ideas/pending
- [x] Suggests top idea(s) with promote command
- [ ] Optional flag --include-ideas surfaces ideas alongside tasks
- [x] No regression when pending tasks exist

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Completed
- [2026-04-29] Condensed
- [2026-10-07] Backlog review 2026-10-07: criteria checked against the code. 3 not met: no --include-ideas flag exists; next-task only surfaces ideas when no tasks are pending.
