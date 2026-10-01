---
id: PLN-004
title: dev-workflow: agent-handoff skill
status: pending
created: 2026-10-01
complexity: medium
---

## Goal
Standardize multi-repo work run by parallel agents: write self-contained handoff prompts and reconcile the reports that come back.

## Context
Usage analysis: 37 explicit asks ("give me the prompt for the backend repo", "2 prompts, FE and BE, so agents work in parallel") and 125 pasted prompts; at least 6 hub sessions coordinating FE/BE/scripts/infra repos. Each handoff is ad-hoc today, so context and done-criteria drift.

## Approach
1. `out` mode: from current context, produce one prompt per target repo with fixed sections: goal, links (ticket/PR/thread), constraints, decisions already made, done-criteria, and a fixed report-back block.
2. `in` mode: user pastes an agent report; compare against the original handoff; list done / open / contradicted.
3. Print next handoffs if work remains.
4. No tracker or file writes; read-only tools only.

## Files to Modify
- `plugins/dev-workflow/skills/agent-handoff/SKILL.md` — new skill (sonnet, effort medium, Read/Grep/Glob)
- `plugins/dev-workflow/README.md` — command table

## Risks & Considerations
- Keep the report-back block short so agents actually follow it.
- Prompts must not include secrets or local absolute paths of other machines.

## Open Questions
- Optionally persist handoffs to a scratch file so `in` mode survives /clear?
