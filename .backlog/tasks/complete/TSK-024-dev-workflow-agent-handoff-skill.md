---
id: TSK-024
title: dev-workflow: agent-handoff skill
status: complete
priority: P2
tags: []
created: 2026-10-07
source: plan/PLN-004
depends-on: []
started: 2026-10-08
completed: 2026-10-08
---

# dev-workflow: agent-handoff skill

## Description

## Goal
Standardize multi-repo work run by parallel agents: write self-contained handoff prompts and reconcile the reports that come back.

## Approach
1. `out` mode: from current context, produce one prompt per target repo with fixed sections: goal, links (ticket/PR/thread), constraints, decisions already made, done-criteria, and a fixed report-back block.
2. `in` mode: user pastes the original handoff plus the agent report; compare them; list done / open / contradicted. Stateless — works after /clear because both inputs are pasted.
3. Print next handoffs if work remains.
4. No tracker or file writes; read-only tools only. `in` mode compares text claims only — it cannot verify state in other repos; say so in the skill.
5. Update README: per-skill section + requirements table row (no external CLI needed).
6. Run `claude plugin validate .`.
7. Ship as a minor bump of dev-workflow (new skill).

## Files to Modify
- `plugins/dev-workflow/skills/agent-handoff/SKILL.md` — new skill (sonnet, effort medium, Read/Grep/Glob, `argument-hint: [out|in]`); description with ≥3 quoted triggers and a when-NOT line.
- `plugins/dev-workflow/README.md` — per-skill section + requirements table row.

## Notes

- Open: whether prompts should name each repo's branch/worktree — settle during implementation.

## Acceptance Criteria

- [x] out mode produces one self-contained prompt per target repo with fixed sections: goal, links, constraints, decisions made, done-criteria, short report-back block
- [x] in mode takes the pasted original handoff plus agent report and lists done / open / contradicted (stateless, survives /clear)
- [x] Next handoffs are printed when work remains
- [x] Skill is read-only (Read/Grep/Glob) and states that in mode compares text claims only
- [x] SKILL.md frontmatter: sonnet, effort medium, argument-hint [out|in], 3+ quoted triggers, when-NOT line (flowstate:parallel, /ci-triage)
- [x] Prompts never include secrets or machine-local absolute paths
- [x] dev-workflow README has a per-skill section and requirements table row
- [x] claude plugin validate . passes
- [x] Released as a minor bump of dev-workflow

## Learnings

- LRN-004: Parallel worktree agents start from a stale base and lack git hooks
## Progress Log

- [2026-10-07] Created
- [2026-10-08] Started
- [2026-10-08] Completed
- [2026-10-08] Backlog check 2026-10-08: criteria ticked retroactively after verification. SKILL.md has out sections Goal/Links/Constraints/Decisions/Done when/Report back, in mode Done/Open/Contradicted + next handoffs, allowed-tools Read/Grep/Glob, text-claims-only limit stated, safety check for secrets and absolute paths, required frontmatter and when-NOT line; README section + Requirements row; claude plugin validate . passes; shipped in dev-workflow v1.3.0 (1f80493 not in v1.2.0).