---
id: TSK-030
title: Add retro skill that turns session mistakes into checks
status: pending
priority: P2
tags: [flowstate, skill, retro]
created: 2026-10-08
source: plan/PLN-012
depends-on: []
---

# Add retro skill that turns session mistakes into checks

## Description

## Goal
A user-invoked `retro` skill that reviews a session and proposes changes to the agent's environment, most severe first, routing each finding to the cheapest durable fix: deterministic check > coding standard > learning > steering file.

## Context
Idea from mattpocock/skills `retro`. Our `add-learning` records lessons but never promotes them into checks. AGENTS.md "Named mistakes" (15 entries) is retro output in prose; several are mechanical and could be enforced (dist edited without src, description lacking quoted triggers, missing `.js` import extension, version edited by hand).


## Approach
1. Home: flowstate. Filing needs flowstate's CLI (`task-create`, `report-create`, `learning-create`), and dev-workflow must not depend on flowstate.
2. Frontmatter: `name: retro`, `disable-model-invocation: true` (user-invoked, one-line human-facing description), `model: sonnet`, `effort: high`, `allowed-tools: Read, Grep, Glob, Bash(node:*), Bash(git:*)`.
3. Source: default to the current session. Read past session logs (`~/.claude/projects/<slug>/*.jsonl`) only when the user passes a path.
4. Categories: navigation (pointers), automated checks (read existing `package.json` scripts, `scripts/pre-commit.mjs`, `.github/workflows/ci.yml` first; a missing guardrail is itself a finding), coding standards, steering-file bloat and no-ops, tool economy, information access.
5. Severity: frequency × cost. A repeated or costly mistake outranks a one-off; a missing guardrail outranks a missing pointer. Present candidates most severe first.
6. Routing per finding:
   - Mechanical (fixed pattern, file location, banned shape) → task for a deterministic check (test, pre-commit step, CI job).
   - Judgement call → proposed edit to the matching AGENTS.md section (no `CODING_STANDARDS.md` in this repo).
   - Non-obvious insight → learning.
   - User-global rules (`~/.claude/rules/`) → proposal only, never edited.
7. Filing: per-item user approval, then CLI directly (`task-create`, `report-create`, `learning-create`); run `learning-search --similar-to` before creating a learning to dedupe. No dependency on other skills' invocation mode. Nothing mutated without approval.
8. Docs and release: entry in `plugins/flowstate/SKILL.md` command table and README; `pnpm bump minor`; `claude plugin validate .` and `pnpm test` pass.
9. Dogfood on this repo: run once over AGENTS.md "Named mistakes" and file the mechanical ones as tasks.



## Acceptance Criteria

- [ ] plugins/flowstate/skills/retro/SKILL.md exists: user-invoked, sonnet/high, minimal allowed-tools
- [ ] Defaults to current session; reads past session logs only when a path is given
- [ ] Candidates ranked by frequency x cost; missing guardrail outranks missing pointer
- [ ] Findings routed: mechanical to check task, judgement to AGENTS.md proposal, insight to learning, user-global rules proposal only
- [ ] Filing via CLI only after per-item approval; learning-search --similar-to runs before learning-create
- [ ] Command tables in plugins/flowstate/SKILL.md and README updated
- [ ] Plugin bumped via pnpm bump minor; claude plugin validate . and pnpm test pass
- [ ] Dogfood run over AGENTS.md Named mistakes files the mechanical ones as tasks

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created