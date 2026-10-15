---
id: TSK-050
title: dev-workflow prune-tests skill for redundant tests
status: complete
priority: P2
tags: []
created: 2026-10-15
source: idea/PLN-025
depends-on: []
started: 2026-10-15
completed: 2026-10-15
---

# dev-workflow prune-tests skill for redundant tests

## Description

### Goal

Add a user-invoked `/dev-workflow:prune-tests` skill. It finds tests that add no value beyond other tests and shows them as a ranked candidate list with evidence for each one. It deletes only the tests the user approves. It then checks that the suite still passes and that coverage held.

A passing suite with the same coverage does not prove fault detection was kept (Rothermel et al., Shi et al. 2018). The safety gate is the user's approval of each candidate, made with the evidence in front of them.

The skill also proposes rewrites that keep a test's checks but make the suite smaller or faster: parameterised tests, fake timers instead of sleeps, shared read-only fixtures. Every rewrite is applied and verified before it is proposed; failed rewrites are never shown.

Full criteria tables, rewrite verification protocol, never-flag rules, risks and references: `.backlog/ideas/complete/PLN-025-dev-workflow-prune-tests-skill-for-redundant.md`.

### Approach

1. **Exploration spike.** Validate the criteria against this repo's suites (flowstate, dev-workflow, atlassian-polish, `scripts/*.test.mjs`). Record findings in `plugins/dev-workflow/references/test-redundancy.md`. Answer: per-test coverage cost (one isolated run per test vs per-file), granularity (blocks vs whole files), coverage formats for v1 (Istanbul JSON + Node LCOV, Node 22+), Stryker `coveredBy`/`killedBy` completeness (`disableBail`).
2. **CLI helpers** in `plugins/dev-workflow/src/commands/`: `detect-test-runner`, `test-static-scan`, `test-verify-rewrite` (restore in `finally`), `coverage-subsets`, `mutation-subsets`. Add a spawn helper for running project test commands with a timeout (only `core/git.ts` spawns today). Wire into `src/bin/dev-workflow.ts` with `--json true`. Colocated vitest tests on real temp dirs.
3. **Skill `skills/prune-tests/SKILL.md`**: detect runner → static scan → consented dynamic pass with cost estimate → judge assertion subsumption + never-flag rules → draft and verify rewrites → present C-labels (deletions), R-labels (rewrites), configuration advice → user approves by label → apply in working tree, no commit → re-run suite + coverage, restore breakers → report, point to `/dev-workflow:commit`.
4. **Docs.** README table row, `/prune-tests` section, prerequisites row. `pnpm lint:skills`, `claude plugin validate .`.
5. **Release.** Minor bump of dev-workflow via `pnpm bump`.

### Review notes

- Spike gates the rest: it may drop `coverage-subsets`/`mutation-subsets` or force file-level granularity.
- Skill needs bare `Bash` in `allowed-tools` (runs project test commands).
- Check the user's Node version for LCOV, not the plugin's `engines`.

## Acceptance Criteria

- [x] Spike done: plugins/dev-workflow/references/test-redundancy.md records final criteria, never-flag rules, false positives, granularity, coverage formats and Stryker killedBy findings; later criteria adjust to its decisions — evidence: references/test-redundancy.md: measured vitest per-file 0.38s vs per-test ~0.4s startup; node LCOV 2.35s; vitest coverage provider absent (not measured); Stryker facts doc-sourced (2026-10-15)
- [x] CLI commands detect-test-runner, test-static-scan, test-verify-rewrite (restore in finally), coverage-subsets and mutation-subsets (as kept by the spike) exist with --json true output and colocated vitest tests on real temp dirs — evidence: 5 commands in src/commands with --json true; 130 dev-workflow tests pass (pnpm test) (2026-10-15)
- [x] A shared spawn helper runs project test commands with a timeout; zero runtime deps kept — evidence: src/core/spawn.ts (spawnSync, argv, timeout, no shell) + spawn.test.ts (2026-10-15)
- [x] skills/prune-tests/SKILL.md is user-invoked (disable-model-invocation: true, model: sonnet, effort: medium, Bash in allowed-tools) and stays under 150 lines, with the rewrite catalog and verification protocol in references/test-redundancy.md — evidence: skills/prune-tests/SKILL.md 132 lines, disable-model-invocation true, sonnet/medium; lint:skills 0 errors 0 warnings (2026-10-15)
- [x] Skill presents C-labelled deletions, R-labelled verified rewrites and unlabelled configuration advice; applies only approved items, never commits, re-runs suite and coverage, restores breaking changes, and states that fault detection is not proven — evidence: Two live runs on a node:test sandbox via --plugin-dir. Run 1 applied C1 C2 C3 R1: file deleted, block edits merged, nothing staged/committed, suite 7 pass 1 skip. Run 2 offered C1-C3, R1 fold, R2 mock timers, 0 dropped, tree clean after verification; footer states fault detection not proven. Restore-on-break path covered by unit tests only. (2026-10-15)
- [x] README command table row, /prune-tests section and prerequisites row added; pnpm lint:skills and claude plugin validate . pass; routing rank-1 ratchet unaffected (LRN-018) — evidence: README row, section, requirements row; pnpm lint:skills 0/0; claude plugin validate plugins/dev-workflow passed; routing-eval rank-1 1.000 ratchet 1 unchanged (2026-10-15)
- [x] dev-workflow minor version bump via pnpm bump — evidence: pnpm bump minor from plugin dir: 1.5.4 -> 1.6.0 in package.json, plugin.json, marketplace.json; nothing committed or tagged (2026-10-15)

## Notes

## Learnings

- LRN-032: Node 24 default test reporter prints 'ℹ pass N', not TAP's '# pass N'
- LRN-033: Static assertion-call count rejects valid table folds
- LRN-034: Plugin skills in a session load from the plugin cache, not from plugins/
## Progress Log

- [2026-10-15] Created
- [2026-10-15] Started
- [2026-10-15] Built the spike findings, five CLI commands with tests, the prune-tests skill, README docs and a 1.6.0 minor bump. Not yet run: the skill end to end on a real repo (apply, restore, re-run). Vitest coverage not measured: no provider installed (needs approval to add). Nothing committed.
- [2026-10-15] Live sandbox runs found 5 bugs, all fixed with regression tests (141 pass): node:assert tautology and delay(n) sleeps not detected, parameterisable groups crossing files, node:test spec reporter count unparsed, fold rewrites dropped by static assertion count (new --claim fold).
- [2026-10-15] Post-test adaptations: test-verify-rewrite --coverage-command compares covered lines/branches of code under test before and after (test file's own lines excluded); skill verifies merged same-file rewrites before applying; Group B clutter now gets C-labels. 145 tests pass, lint 0/0, validate passed; live LCOV check: fold 0 lost, coverage-dropping rewrite fails with 2 lost.
- [2026-10-15] pnpm sandbox:prune-tests live run: PASS (no commit, nothing staged, only test/ changed, RPT-007 guard kept, suite green). All approved labels applied incl. clutter C-labels, merged fold + mock-timer rewrite in one file. Harness and rules (playbook mistakes 17-23) added.
- [2026-10-15] Completed