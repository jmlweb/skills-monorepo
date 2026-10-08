---
id: TSK-037
title: Adopt round-based grilling format in idea and add-task
status: pending
priority: P3
tags: []
created: 2026-10-08
source: plan/PLN-016
depends-on: []
---

# Adopt round-based grilling format in idea and add-task

## Description

## Goal
Make clarifying questions in `flowstate:idea` and `add-task` efficient: ask in rounds over the frontier, numbered, each with a recommended answer worded so "yes" accepts it.

## Context
Idea from mattpocock/skills `grilling`. Frontier = questions whose prerequisites are settled. Facts are the agent's job (look them up, via subagent if needed, without blocking unrelated questions); decisions are the user's. Done when the frontier is empty and the user confirms shared understanding.


## Approach
1. Create `plugins/flowstate/shared/grilling.md` (flowstate has no `shared/` yet; mirror dev-workflow's pattern), referenced via `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md`.
2. Rules in it:
   - Ask in rounds over the frontier (questions whose prerequisites are settled); each question carries a recommended answer worded so "yes" accepts it.
   - Facts are looked up inline with Read/Grep/Glob; never ask the user what the repo can answer. No subagent, no allowed-tools change.
   - Format: labelled blocks (`**Q1 · title**` + recommendation) separated by `---`, never a markdown numbered list (adjacent numbered lists merge when rendered).
   - Done when every question is answered or accepted and the user confirms the summary.
3. `idea` (sonnet/high): full frontier rounds in the gather-context step.
4. `add-task` (haiku): one proposal round (title, description, acceptance criteria, priority, each with a recommendation; "yes" accepts all), replacing the iterative criteria loop.
5. `pnpm bump patch` in flowstate; `claude plugin validate .` and `pnpm test` pass.



## Acceptance Criteria

- [ ] plugins/flowstate/shared/grilling.md exists and is referenced via CLAUDE_PLUGIN_ROOT
- [ ] Rules: frontier rounds, recommendation per question where yes accepts, inline fact lookup, labelled-block format, explicit done condition
- [ ] idea gather-context step uses full rounds
- [ ] add-task uses one proposal round where yes accepts all
- [ ] flowstate bumped via pnpm bump patch; claude plugin validate . and pnpm test pass

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created