---
id: PLN-021
title: Add routing evals for skill descriptions
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-039
---

## Goal
Measure whether each skill's description routes the right prompts to it and away from its neighbours, so description edits (TSK-028, TSK-032 audits) are judged on evidence instead of by eye.

## Context
Source: the review of agent-skill repos (2026-10-08). Three repos test routing:
- addyosmani/agent-skills `scripts/run-evals.js`: deterministic, no LLM, gates CI. It uses stemmed TF-IDF over descriptions. Positive prompts must rank their skill in the top 3; negative prompts must not rank it first. Near-duplicate descriptions fail, and a `--min-rank1` threshold blocks regressions. Every new skill needs ≥3 positive prompts, ≥2 negative prompts and 1 behavioural case (`evals/README.md`, CONTRIBUTING). The repo notes that real triggering is stochastic: one skill fired 5 times in 7 runs, another 2 in 7.
- anthropics/skills `skills/skill-creator/scripts/run_eval.py`, `run_loop.py`: measure real trigger rate with `claude -p` stream-json. They use 8-10 should-trigger and 8-10 near-miss should-not queries, 3 runs per query.
- obra/superpowers `tests/explicit-skill-requests/`: prompt fixtures for routing. Its AGENTS.md also requires before/after eval evidence for any wording change.

Why we need it: flowstate has 18 skills with overlapping vocabulary (`idea`/`add-task`, `check-task`/`overview`, `report`/`add-learning`, `condense-tasks`/`condense-learnings`, `next-task`/`parallel`). TSK-028 will rewrite descriptions and TSK-032..035 will slim them, and nothing today detects that a rewrite made `add-task` steal `idea`'s prompts.

`claude plugin eval` exists locally (checked with `claude plugin eval --help`). It reads `<plugin>/evals/**/case.yaml` or `prompt.md` + `graders/*.md`, runs a no-plugin baseline arm (`--ablation with-without`), and supports a `tool_used: Skill` grader. That covers the live tier with no new tooling.

## Approach
1. Tier 1, deterministic, in `pnpm test`:
   1. Store cases in `plugins/<plugin>/evals/routing.json`: `{ "<skill>": { "positive": [...], "negative": [{ "prompt": "...", "owner": "<skill>" }] } }`. `claude plugin eval` only reads `case.yaml`/`prompt.md`, so the two tiers share `evals/` without clashing.
   2. Create `scripts/routing-eval.mjs`, zero dependencies: tokenize, a light suffix-stripping stemmer, TF-IDF over each plugin's skill descriptions, cosine similarity.
   3. Checks: positive prompt → skill in the top 3; negative prompt → skill not first and owner in the top 3; any description pair above a similarity threshold is a collision; each plugin's rank-1 rate must stay at or above a ratchet stored in `routing.json`.
   4. Add `scripts/routing-eval.test.mjs` (`node:test`): fixture plugins for each check, plus a run on the real plugins.
   5. Write the first cases: ≥3 positive and ≥2 near-miss negative prompts per skill, starting with the overlapping flowstate pairs listed above. Take the positive prompts from the quoted triggers already in the descriptions.
2. Tier 2, live and manual (not in CI; it costs model calls and is stochastic):
   1. Add `plugins/<plugin>/evals/<case>/case.yaml` cases for the overlapping pairs, using a `tool_used: Skill` grader.
   2. Document the run in AGENTS.md: `claude plugin eval plugins/flowstate --case '<glob>'`, before and after any description change, with both results recorded in the task's Progress Log.
3. AGENTS.md: add to the "New or edited skill" quality bar that routing cases are added or updated and tier 1 passes; tier 2 is required when a description changes.
4. Sequencing: land this before TSK-028 so its description rewrites have a baseline.

## Files to Modify
- `scripts/routing-eval.mjs` — new deterministic scorer
- `scripts/routing-eval.test.mjs` — new node:test suite
- `plugins/flowstate/evals/routing.json`, `plugins/dev-workflow/evals/routing.json`, `plugins/atlassian-polish/evals/routing.json` — new routing cases
- `plugins/flowstate/evals/<case>/case.yaml` — live trigger cases for overlapping pairs
- `package.json` — `eval:routing` script
- `AGENTS.md` — quality bar and description-change rule
- `.claude/skills/new-skill/SKILL.md` — ask for routing cases when scaffolding

## Risks & Considerations
- Lexical similarity is a proxy. Claude routes semantically and won't trigger a skill for tasks it handles alone (per skill-creator). Tier 1 catches collisions and regressions; it does not predict trigger rates. Keep the ratchet modest at first.
- The `evals/` dirs ship to users, because the marketplace clones the repo. They are small and never loaded into context, so that is acceptable. Check with `claude plugin details` that the projected token cost is unchanged.
- Tier 2 runs on the user's credential and rate limit; keep the case count small (overlapping pairs only).
- Collision threshold needs tuning on real descriptions. Set it just above today's highest legitimate pair, and record the value and why in `routing.json`.

## Open Questions
- Should the routing cases cover user-invoked skills after TSK-028? They leave model routing, so probably not. The test would read `disable-model-invocation` and skip them.
