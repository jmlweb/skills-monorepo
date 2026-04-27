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
---

# next-task fallback: promote from ideas/pending when backlog has no pending tasks

## Description

When pending/ empty, next-task output not actionable. Skill (or new CLI command next-from-ideas) should surface ideas/pending as candidates and offer promotion to task.

## Acceptance Criteria

- [ ] next-task skill detects empty pending and inspects ideas/pending
- [ ] Suggests top idea(s) with promote command
- [ ] Optional flag --include-ideas surfaces ideas alongside tasks
- [ ] No regression when pending tasks exist

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Started
- [2026-04-27] Added idea-list CLI command (--status pending|complete|all, --limit). Updated next-task SKILL.md to call idea-list when pending tasks empty and surface top ideas with promote-via-review-idea handoff. 9 new tests (8 unit + 1 integration). 191/191 passing.
- [2026-04-27] Completed