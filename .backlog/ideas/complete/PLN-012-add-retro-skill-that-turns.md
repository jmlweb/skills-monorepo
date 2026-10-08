---
id: PLN-012
title: Add retro skill that turns session mistakes into checks
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-030
---

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

## Files to Modify
- `plugins/flowstate/skills/retro/SKILL.md` — new
- `plugins/flowstate/SKILL.md` — command table entry
- `plugins/flowstate/README.md` — command table
- possibly `plugins/flowstate/skills/add-learning/SKILL.md` — pointer to retro for promotion
- `plugins/flowstate/{package.json,.claude-plugin/plugin.json}` + root `marketplace.json` — via `pnpm bump minor`

## Risks & Considerations
- Sequence after TSK-028: both edit the `plugins/flowstate/SKILL.md` command table and AGENTS.md skill conventions.
- Session log format is harness-specific; current session is the default.
- Must not mutate anything without approval.
- Severity ranking is a judgement call; keep the rule short so output stays consistent.

## Revision History
- [2026-10-08] Resolved home to flowstate; added frontmatter step; filing via CLI directly with learning dedupe; severity rule; findings routing (mechanical → check task, judgement → AGENTS.md proposal, user-global → proposal only); session-log default; SKILL.md table and version bump in files; sequencing risk after TSK-028.
