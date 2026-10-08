---
id: TSK-032
title: Write skill-writing rules doc and wire into AGENTS.md and new-skill
status: active
priority: P2
tags: [skills, writing-rules, docs]
created: 2026-10-08
source: plan/PLN-013
depends-on: []
started: 2026-10-08
---

# Write skill-writing rules doc and wire into AGENTS.md and new-skill

## Description

## Goal
Codify skill-writing rules so new and edited skills stay short and predictable.

## Approach
Steps 1-3 of PLN-013: write docs/writing-skills.md, add trigger-worded AGENTS.md pointer and new house-range wording, update new-skill.


## Acceptance Criteria

- [ ] docs/writing-skills.md exists (<300 lines) covering no-ops, positive phrasing, leading words, completion criteria, progressive disclosure
- [ ] AGENTS.md has a trigger-worded pointer to it and house range reads: as short as the behaviour allows; ceiling 150
- [ ] new-skill applies the rules: completion criterion per step and a no-op pass
- [ ] dev-workflow:check-docs passes on the new doc

## Notes

## Learnings

- LRN-008: Worktree agents must call /usr/bin/git; RTK rewrite trips the isolation guard
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Scope added from discarded PLN-017: rules doc must state the hard vs soft setup-dependency rule (explicit 'run setup first' pointer only where output is wrong without setup; audit 2026-10-08 found all 8 existing pointers are hard deps, no fixes needed).
- [2026-10-08] Scope added from discarded PLN-018: rules doc states the skill-call convention: operative call = explicit 'Call the Skill tool with <plugin:skill>', one skill per call, model-invoked targets only; user suggestion = '/plugin:skill'.
- [2026-10-08] Started