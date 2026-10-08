---
id: TSK-039
title: Add routing evals for skill descriptions
status: active
priority: P2
tags: [skills, evals, routing]
created: 2026-10-08
source: plan/PLN-021
depends-on: []
started: 2026-10-08
---

# Add routing evals for skill descriptions

## Description

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



## Acceptance Criteria

- [ ] scripts/routing-eval.mjs (zero-dep TF-IDF) checks positive top-3, negative not-rank-1, description collisions and a per-plugin rank-1 ratchet
- [ ] scripts/routing-eval.test.mjs covers each check with fixtures plus a real-plugin run; pnpm test passes
- [ ] evals/routing.json per plugin with >=3 positive and >=2 near-miss negative prompts per model-invoked skill
- [ ] claude plugin eval case.yaml cases for overlapping flowstate pairs run once, results logged
- [ ] claude plugin validate . still passes with evals/ dirs and claude plugin details token cost unchanged
- [ ] AGENTS.md quality bar and new-skill require routing cases and a before/after tier-2 run on description changes

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started