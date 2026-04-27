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
---

# add-learning skill: dedupe check via learning-search before create

## Description

Auto-draft path in add-learning does not search existing learnings by title before creating. Risk: near-duplicate entries. Skill should call learning-search with title keywords first; CLI optional --similar-to flag for ergonomic call.

## Acceptance Criteria

- [ ] add-learning skill runs learning-search with title before creating
- [ ] Top N matches surfaced with score
- [ ] User confirms create / merge into existing / cancel
- [ ] Optional CLI flag --similar-to <title> on learning-search
- [ ] Threshold tuning documented

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Started
- [2026-04-27] Added --similar-to alias for --query on learning-search (dedupe use case). Updated add-learning SKILL.md with new Step 2c dedupe check: search by title+tags before create, decide based on top match score (>=5 ask, 2-4 mention, <=1 silent). 1 new integration test. 192/192 passing.
- [2026-04-27] Completed