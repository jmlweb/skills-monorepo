---
id: TSK-052
title: flowstate kickstart skill: description to evaluated, documented, tasked project
status: active
priority: P2
tags: [flowstate, skills, agents]
created: 2026-10-17
source: idea/PLN-028
depends-on: []
started: 2026-10-17
---

# flowstate kickstart skill: description to evaluated, documented, tasked project

## Description

### Goal

Add a user-invoked `/flowstate:kickstart` skill that takes a project description and, in five gated phases, produces an evaluated idea, architecture decisions, starter docs and rules, an independent review, and a first set of backlog tasks in the target project.

### Approach

1. Write `plugins/flowstate/shared/kickstart-templates.md` with the ADR template (Context / Decision / Consequences / Status), the `AGENTS.md` skeleton, the `docs/overview.md` skeleton and the evaluation rubric (cite a source for every competitor claim, verdict before reasons, "no gap" is allowed). The ADR template includes a hard rule: name a mechanism class, never a product, library or framework.
2. Write `plugins/flowstate/agents/kickstart-reviewer.md` (`tools: Read`, `model: sonnet`, `effort: high`). Given the generated file paths and the goal statement, it returns findings: ADRs naming products, decisions contradicting the goal or constraints, docs or rules disagreeing with ADRs, vague or untestable `AGENTS.md` rules. Text only.
3. Write `plugins/flowstate/skills/kickstart/SKILL.md` (≤150 lines; `allowed-tools`: Read, Write, Edit, WebSearch, Agent, `Bash(node:*)`, `Bash(ln:*)`):
   1. Prerequisites: resolve the backlog, or create it with the CLI `setup` command (public by default; mention `--private`).
   2. Grilling per `shared/grilling.md` until goal, users, scope and constraints are known.
   3. Evaluate: feasibility verdict, WebSearch market scan with links, gap or frank "no gap", goal fixed; save to `docs/evaluation.md`. Checkpoint.
   4. Initialize: `docs/adr/NNNN-*.md`, `AGENTS.md` + `CLAUDE.md` symlink (pointer-file fallback), `docs/overview.md`, project skill proposals written to `.claude/skills/` only on approval. Never overwrite: diff and ask. Checkpoint.
   5. Review: spawn `flowstate:kickstart-reviewer`, apply accepted fixes, at most one re-review. Checkpoint.
   6. Tasks: walking-skeleton list in rounds, `task-create` each with `depends-on`.
   7. Confirmation block: files written and task IDs.
4. Register: README command table + flow entry, `skills/guide/SKILL.md`, root `SKILL.md`, routing evals if they enumerate user-invoked skills (LRN-018). Define "ADR" in `GLOSSARY.md` if used as repo vocabulary.
5. Sandbox harness `scripts/sandbox-kickstart.mjs` + `pnpm sandbox:kickstart` on a throwaway repo with the temperature-tower brief (PrusaSlicer; OrcaSlicer native generator is the expected finding). The prompt auto-accepts grilling recommendations and checkpoints. Invariants: ADR files exist, no ADR names a deny-listed library, `CLAUDE.md` is a symlink, tasks exist.
6. Validate: `pnpm lint:skills`, `claude plugin validate .`, `claude plugin validate plugins/flowstate` (LRN-009); bump flowstate minor.

### Risks

Length (progressive disclosure into `shared/`), honesty drift, ADR altitude, first skill writing project files, symlink portability, reviewer independence (LRN-003), scope creep, WebSearch unavailability (degrade to "unverified").

## Acceptance Criteria

- [x] shared/kickstart-templates.md holds ADR (Context/Decision/Consequences/Status, mechanism-class rule), AGENTS.md and docs/overview.md templates plus the evaluation rubric
- [x] agents/kickstart-reviewer.md exists: tools Read, model sonnet, effort high, returns findings only
- [x] skills/kickstart/SKILL.md is user-invoked, sonnet/high, <=150 lines, with grilling, evaluation (saved to docs/evaluation.md), initialize, review, tasks and confirmation steps and three approval checkpoints
- [x] Backlog creation goes through the CLI setup command, defaulting to public and mentioning the private option
- [x] Skill never overwrites existing project files and falls back to a pointer CLAUDE.md when a symlink fails
- [x] README command table, skills/guide/SKILL.md, root SKILL.md and routing evals (if needed) list kickstart
- [ ] scripts/sandbox-kickstart.mjs and pnpm sandbox:kickstart run the temperature-tower brief, auto-accept checkpoints, and check ADRs, deny-list, CLAUDE.md symlink and tasks
- [x] pnpm lint:skills, claude plugin validate . and claude plugin validate plugins/flowstate pass; flowstate bumped minor

## Notes

## Learnings

## Progress Log

- [2026-10-17] Created
- [2026-10-17] Started
- [2026-10-17] Wrote shared/kickstart-templates.md, agents/kickstart-reviewer.md (flowstate's first agent), skills/kickstart/SKILL.md (113 lines, user-invoked, sonnet/high)
- [2026-10-17] allowed-tools adds Glob and Grep to the spec list: shared/grilling.md looks facts up with them
- [2026-10-17] Backlog: kickstart creates a public backlog only; a private one needs /flowstate:setup plus restart first, because FLOWSTATE_BACKLOG_DIR is read only at session start
- [2026-10-17] CLAUDE.md: ln -s only when absent; @AGENTS.md pointer when ln fails; existing CLAUDE.md goes through the write guard (diff and ask)
- [2026-10-17] Routing evals unchanged: routing-eval.mjs drops user-invoked skills and fails on routing.json entries for them
- [2026-10-17] Registered in README table + mermaid flow, guide, root SKILL.md; GLOSSARY gains ADR (project file, not an entity)
- [2026-10-17] scripts/sandbox-kickstart.mjs + test (5 cases) + pnpm sandbox:kickstart; runHarness gained env, harness sets FLOWSTATE_SHARED=off to keep the sandbox backlog out of the registry
- [2026-10-17] Gates: pnpm test, lint:skills 0/0, names:check, version:check, claude plugin validate . and plugins/flowstate all pass; bumped flowstate 2.15.1 -> 2.16.0
- [2026-10-17] Pending: live pnpm sandbox:kickstart run (interactive, user-driven)
- [2026-10-17] PR #6 review (request changes) addressed in f1230d0 plus the harness follow-up: product side added (grilling product frontier; evaluation Build verdict, need evidence, goal-specific viability, riskiest assumption with cheapest validation, kill criteria; overview product sections; task 1 tests the riskiest assumption, every task states its Outcome); reviewer gains evaluation-rubric and product-fit checks
- [2026-10-17] Skill fixes: walk-up backlog outside the cwd treated as none; files written before checkpoint 2; write guard applies hunks with Edit; stop and infeasible exits defined; criteria phrased without apostrophes
- [2026-10-17] Harness: Decision-only deny-list scan, @AGENTS.md pointer accepted, accepted status, both verdicts, product sections, Outcome lines, 3-8 tasks with a depends-on link; regexes case-insensitive; 9 node:test cases
- [2026-10-17] Review #29 accepted as is (the reviewer runs before tasks exist); #17 (${CLAUDE_PLUGIN_ROOT} expanding in the agent body) is a by-eye check in the live run
- [2026-10-17] Pending: live pnpm sandbox:kickstart run (criterion 7)