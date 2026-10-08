---
id: TSK-036
title: Add GLOSSARY.md and fix entity-name drift
status: pending
priority: P3
tags: [docs, naming, flowstate]
created: 2026-10-08
source: plan/PLN-015
depends-on: []
---

# Add GLOSSARY.md and fix entity-name drift

## Description

## Goal
A short glossary (term, definition, words to avoid) fixing the repo's ubiquitous language.

## Context
Idea from mattpocock/skills `GLOSSARY.md`. Our vocabulary drifts: idea / plan / PLN, task vs ticket, report vs finding vs bug, learning, entity, backlog. An `_Avoid_: plan` line enforces invariant 7 more reliably than prose.


## Approach
1. Inventory terms from flowstate CLI types (`src/core/types.ts`), skills and READMEs; list drift sites.
2. Write `GLOSSARY.md` (under ~60 lines):
   - Language: task, idea (contains an implementation plan; ID prefix `PLN` kept), report (_Avoid_: bug/finding as entity names), learning, backlog, entity.
   - Relationships between them.
   - Flagged ambiguities: `PLN` prefix and `ideas/` dir kept after the plan → idea rename; "implementation plan" stays valid as a description of an idea's content.
3. Fix the drift found in step 1 in skill headings and prose, starting with `idea` ("# Generate Plan") and `review-idea` ("# Review Plan", "pending plans").
4. AGENTS.md pointer worded as a trigger: "when naming a backlog entity or writing skill prose, use GLOSSARY.md terms".
5. `pnpm bump patch` in flowstate; `claude plugin validate .` and `pnpm test` pass.



## Acceptance Criteria

- [ ] GLOSSARY.md exists (~60 lines) with Language, Relationships, Flagged ambiguities
- [ ] idea entry states it contains an implementation plan and keeps the PLN prefix
- [ ] Drift sites found by inventory fixed: idea and review-idea headings/prose use idea as entity name
- [ ] AGENTS.md has trigger-worded pointer to GLOSSARY.md
- [ ] flowstate bumped via pnpm bump patch; claude plugin validate . and pnpm test pass

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created