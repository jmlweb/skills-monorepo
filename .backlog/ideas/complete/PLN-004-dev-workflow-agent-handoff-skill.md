---
id: PLN-004
title: dev-workflow: agent-handoff skill
status: approved
created: 2026-10-01
complexity: medium
reviewed: 2026-10-07
task-id: TSK-024
---

## Goal
Standardize multi-repo work run by parallel agents: write self-contained handoff prompts and reconcile the reports that come back.

## Context
Usage analysis: 37 explicit asks ("give me the prompt for the backend repo", "2 prompts, FE and BE, so agents work in parallel") and 125 pasted prompts; at least 6 hub sessions coordinating FE/BE/scripts/infra repos. Each handoff is ad-hoc today, so context and done-criteria drift.

## Approach
1. `out` mode: from current context, produce one prompt per target repo with fixed sections: goal, links (ticket/PR/thread), constraints, decisions already made, done-criteria, and a fixed report-back block.
2. `in` mode: user pastes the original handoff plus the agent report; compare them; list done / open / contradicted. Stateless — works after /clear because both inputs are pasted.
3. Print next handoffs if work remains.
4. No tracker or file writes; read-only tools only. `in` mode compares text claims only — it cannot verify state in other repos; say so in the skill.
5. Update README: per-skill section + requirements table row (no external CLI needed).
6. Run `claude plugin validate .`.
7. Ship as a minor bump of dev-workflow (new skill).

## Files to Modify
- `plugins/dev-workflow/skills/agent-handoff/SKILL.md` — new skill (sonnet, effort medium, Read/Grep/Glob, `argument-hint: [out|in]`). Description carries ≥3 quoted triggers ("give me the prompt for the backend repo", "prompts for FE and BE", "here's the agent report") and a when-NOT line: same-repo parallel work → `flowstate:parallel`; red CI → `/ci-triage`.
- `plugins/dev-workflow/README.md` — per-skill section + requirements table row

## Risks & Considerations
- Keep the report-back block short so agents actually follow it.
- Prompts must not include secrets or local absolute paths of other machines.

## Deferred
- Persisting handoffs to a scratch file: deferred. Stateless paste-both input covers /clear for now.

## Revision History
- [2026-10-08] Resolved open question (stateless `in` mode, handoff + report pasted); added argument-hint, trigger phrases, when-NOT line; added README, validate and minor-bump steps; noted text-only verification limit.
