---
id: TSK-014
title: add-learning skill: dedupe check via learning-search before create
status: complete
priority: P3
tags: [flowstate, learnings, skill]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
condensed: true
---

# add-learning skill: dedupe check via learning-search before create

## Description

Auto-draft path in add-learning does not search existing learnings by title before creating. Risk: near-duplicate entries. Skill should call learning-search with title keywords first; CLI optional --similar-to flag for ergonomic call.

## Acceptance Criteria

- [x] add-learning skill runs learning-search with title before creating
- [x] Top N matches surfaced with score
- [x] User confirms create / merge into existing / cancel
- [x] Optional CLI flag --similar-to <title> on learning-search
- [ ] Threshold tuning documented

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Completed
- [2026-04-29] Condensed
- [2026-10-07] Backlog review 2026-10-07: criteria checked against the code. 5 not met: dedupe thresholds are hardcoded in add-learning SKILL.md, and nothing records how they were tuned.
