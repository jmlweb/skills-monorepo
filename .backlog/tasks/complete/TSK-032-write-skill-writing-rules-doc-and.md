---
id: TSK-032
title: Write skill-writing rules doc and wire into AGENTS.md and new-skill
status: complete
priority: P2
tags: [skills, writing-rules, docs]
created: 2026-10-08
source: idea/PLN-013
depends-on: []
started: 2026-10-08
completed: 2026-10-08
condensed: true
---

# Write skill-writing rules doc and wire into AGENTS.md and new-skill

## Description

## Goal
Codify skill-writing rules so new and edited skills stay short and predictable.

## Approach
Steps 1-3 of PLN-013: write docs/writing-skills.md, add trigger-worded AGENTS.md pointer and new house-range wording, update new-skill.


## Acceptance Criteria

- [x] docs/writing-skills.md exists (<300 lines) covering no-ops, positive phrasing, leading words, completion criteria, progressive disclosure
- [x] AGENTS.md has a trigger-worded pointer to it and house range reads: as short as the behaviour allows; ceiling 150
- [x] new-skill applies the rules: completion criterion per step and a no-op pass
- [x] dev-workflow:check-docs passes on the new doc

## Notes

## Learnings

- LRN-008: Worktree agents must call /usr/bin/git; RTK rewrite trips the isolation guard
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Completed
- [2026-11-07] Condensed
