---
id: PLN-016
title: Adopt round-based grilling format in idea and add-task
status: approved
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
task-id: TSK-037
---

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

## Files to Modify
- `plugins/flowstate/shared/grilling.md` — new
- `plugins/flowstate/skills/idea/SKILL.md` — gather-context step
- `plugins/flowstate/skills/add-task/SKILL.md` — grooming step
- flowstate version files — via `pnpm bump patch`

## Risks & Considerations
- Over-questioning on trivial tasks; allow skipping when the description is already complete.
- Haiku may compute a poor frontier; add-task keeps a single proposal round for that reason.
- Road not taken: `AskUserQuestion` (4-question cap, multiple-choice pushes pre-baked answers).

## Revision History
- [2026-10-08] Inline fact lookup (no subagent); labelled-block format instead of numbered list; full rounds in idea, single proposal round in add-task; explicit done condition; patch bump, validate, tests.
