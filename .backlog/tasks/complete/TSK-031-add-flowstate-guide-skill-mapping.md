---
id: TSK-031
title: Add flowstate guide skill mapping the flows
status: complete
priority: P3
tags: [flowstate, skill, docs]
created: 2026-10-08
source: plan/PLN-010
depends-on: [TSK-030]
started: 2026-10-09
completed: 2026-10-09
---

# Add flowstate guide skill mapping the flows

## Description

## Goal
One user-invoked skill (`flowstate:guide`) that maps flowstate's 18 commands into flows, so the user remembers one command instead of eighteen.

## Context
Idea from mattpocock/skills `ask-matt`: a router over user-invoked skills, organized as a main flow, on-ramps, maintenance, standalone. Pairs with the user-invoked split idea: the more skills leave the agent's reach, the more a human-facing map is needed.


## Approach
1. Name: `guide` (`help` collides with built-in `/help` when typed bare; `flows` is vague).
2. Map:
   - Main flow: `idea → review-idea → start-task → log-progress → complete-task` (approving an idea creates the task).
   - Direct entry: `add-task` (skips the idea step).
   - On-ramps: `report → triage-report`; `block-task` when stuck.
   - Maintenance: `condense-tasks`, `condense-learnings`, `check-task`, `overview`.
   - Parallel: `next-task → parallel`.
   - Knowledge: `add-learning`, `learnings`, `retro` (TSK-030).
   - Precondition: `setup`.
3. Split of jobs: `guide` holds flows, order, and "when to reach for it" branches for the human; the always-on `plugins/flowstate/SKILL.md` table (lines ~74-91) stays a flat command list for the model. No flat list duplicated in `guide`.
4. Body rule: read a skill's SKILL.md before claiming what it does (summaries are orientation only). Stateless: no CLI calls.
5. Frontmatter: `disable-model-invocation: true`, one-line human-facing description, `model: haiku`, `allowed-tools: Read`.
6. AGENTS.md rule: adding, renaming or removing a flowstate skill updates both `guide` and the `SKILL.md` table ("a router that lies is worse than none").
7. Add `guide` to the `SKILL.md` table and README; `pnpm bump minor`; `claude plugin validate .` and `pnpm test` pass.



## Acceptance Criteria

- [x] plugins/flowstate/skills/guide/SKILL.md exists: user-invoked, one-line description, haiku, allowed-tools Read, stateless
- [x] Map matches the revised flows: idea → review-idea → start-task → log-progress → complete-task; add-task as direct entry; on-ramps, maintenance, parallel, knowledge (incl. retro), setup precondition
- [x] guide holds flows and branches only; SKILL.md table stays a flat command list
- [x] Body requires reading a skill SKILL.md before describing it
- [x] AGENTS.md sync rule covers both guide and SKILL.md table
- [x] guide added to SKILL.md table and README
- [x] Plugin bumped via pnpm bump minor; claude plugin validate . and pnpm test pass

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-09] Started
- [2026-10-09] Added skills/guide/SKILL.md, SKILL.md table row, README row, AGENTS.md sync rule
- [2026-10-09] Bumped flowstate to 2.12.0; lint:skills, plugin validate, pnpm test all pass
- [2026-10-09] Completed