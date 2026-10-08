---
id: TSK-028
title: Split skills into user-invoked and model-invoked
status: complete
priority: P2
tags: [skills, invocation, context]
created: 2026-10-08
source: plan/PLN-009
depends-on: [TSK-039]
started: 2026-10-08
completed: 2026-10-08
---

# Split skills into user-invoked and model-invoked

## Description

## Goal
Cut always-loaded context by making hand-fired skills user-invoked (`disable-model-invocation: true`), keeping model-invoked only the skills the agent or another skill must reach on its own.

## Approach
1. Audit every skill: could the model usefully reach for it autonomously, or does another skill call it via the Skill tool? Record verdict per skill.
2. Candidates for user-invoked: flowstate `condense-tasks`, `condense-learnings`, `setup`, `parallel`, `review-idea`, `triage-report`; atlassian-polish `atlassian-setup`; dev-workflow `agent-handoff`, `pr-ready`; repo-local `.claude/skills/release-plugin`. Open: `report`, `add-learning` (leaning model-invoked).
3. Cross-references audited at review: all existing mentions of candidates are user-facing "run /x" hints (valid after flip). Still check `pr-ready:56` Skill-tool reference.
4. For flipped skills, set the flag and rewrite `description` as a one-line human-facing summary.
5. AGENTS.md: invocation rule in Skills conventions + "New or edited skill" quality bar.
6. Update `.claude/skills/new-skill` to ask the invocation question up front.
7. Update `plugins/flowstate/SKILL.md` command table (lines ~83-90) to mark user-only commands.
8. Add plugin test guarding one-line descriptions on user-invoked skills.
9. `pnpm bump minor` in each affected plugin; `claude plugin validate .`; `pnpm test`.

README grouping by invocation dropped from scope (review decision).


## Acceptance Criteria

- [x] Every skill (plugins + .claude/skills) has a recorded invocation verdict: user-invoked or model-invoked, with reason — evidence: verdicts in log line 1 (2026-10-08)
- [x] Flipped skills carry disable-model-invocation: true and a one-line human-facing description (no trigger lists) — evidence: pnpm lint:skills → 0 errors (2026-10-08)
- [x] No skill makes an operative Skill-tool call to a flipped skill (pr-ready Skill-tool reference checked) — evidence: grep Skill tool → only pr-ready:57 calling ci-triage (model-invoked); next-task now tells user to run /flowstate:parallel and review-idea (2026-10-08)
- [x] AGENTS.md states the invocation rule; trigger-phrase quality bar applies to model-invoked skills only — evidence: AGENTS.md Invocation mode bullet + quality bar item + named mistake 11 (2026-10-08)
- [x] new-skill asks the invocation question up front — evidence: new-skill step 2 Pick the invocation mode (2026-10-08)
- [x] plugins/flowstate/SKILL.md command table reflects the split — evidence: flowstate SKILL.md table marks 6 user-only (2026-10-08)
- [x] A plugin test asserts user-invoked skills have a one-line description — evidence: TSK-038 lint rule description-triggers exempts disable-model-invocation; no separate test added (2026-10-08)
- [x] Affected plugins bumped via pnpm bump; claude plugin validate . and pnpm test pass — evidence: pnpm test → 7/7 tasks; claude plugin validate . and plugins/* pass; bumped flowstate 2.10.0, dev-workflow 1.5.0, atlassian-polish 0.9.0 (2026-10-08)

## Notes

## Learnings

- LRN-018: Flipping skills to user-invoked shifts the routing rank-1 ratchet
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Scope added from discarded PLN-018: next-task SKILL.md lines ~121/123 hand off to /flowstate:parallel operatively. If parallel stays model-invoked, rewrite as 'Call the Skill tool with flowstate:parallel'; if flipped to user-invoked, change to 'tell the user to run /flowstate:parallel <IDs>'.
- [2026-10-08] Backlog check: criterion 7 and step 8 (one-line description test for user-invoked skills) are absorbed by TSK-038 lint rule 3. If TSK-038 lands first, satisfy criterion 7 by pointing at the lint rule instead of adding a separate test.
- [2026-10-08] TSK-041: model-invoked skill descriptions follow docs/writing-skills.md section 6 (what clause, 3+ quoted triggers, Not for X). User-invoked ones stay one-line human-facing.
- [2026-10-08] TSK-038 lint absorbs step 8 (one-line description guard for user-invoked skills); implement it as a lint rule, not a plugin test.
- [2026-10-08] Started
- [2026-10-08] Verdicts user-invoked (disable-model-invocation, one-line description): flowstate condense-tasks, condense-learnings, setup, parallel, review-idea, triage-report; atlassian-polish atlassian-setup; dev-workflow agent-handoff, pr-ready; repo-local release-plugin. Reason: hand-fired, no model or skill reaches them autonomously (retro was already user-invoked).
- [2026-10-08] Verdicts model-invoked: report and add-learning (model files findings on its own); all other flowstate CRUD skills, dev-workflow commit/changeset/check-docs/ci-triage/open-pr/review-pr, polish-atlassian, repo-local new-plugin/new-skill (auto-scaffold on request).
- [2026-10-08] Side effects: next-task handoffs now tell the user to run /flowstate:parallel and /flowstate:review-idea; routing.json entries and negatives for flipped skills removed; condense-tasks/condense-learnings/parallel tier-2 fires evals deleted; flowstate rank1Ratchet lowered 0.925 to 0.916 (same 3 misses, smaller denominator); routing-eval skips negative minimum when only one routable skill (atlassian-polish).
- [2026-10-08] Completed