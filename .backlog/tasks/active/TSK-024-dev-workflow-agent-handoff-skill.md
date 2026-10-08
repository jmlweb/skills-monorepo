---
id: TSK-024
title: dev-workflow: agent-handoff skill
status: active
priority: P2
tags: []
created: 2026-10-07
source: plan/PLN-004
depends-on: []
started: 2026-10-08
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

- [ ] out mode produces one self-contained prompt per target repo with fixed sections: goal, links, constraints, decisions made, done-criteria, short report-back block
- [ ] in mode takes the pasted original handoff plus agent report and lists done / open / contradicted (stateless, survives /clear)
- [ ] Next handoffs are printed when work remains
- [ ] Skill is read-only (Read/Grep/Glob) and states that in mode compares text claims only
- [ ] SKILL.md frontmatter: sonnet, effort medium, argument-hint [out|in], 3+ quoted triggers, when-NOT line (flowstate:parallel, /ci-triage)
- [ ] Prompts never include secrets or machine-local absolute paths
- [ ] dev-workflow README has a per-skill section and requirements table row
- [ ] claude plugin validate . passes
- [ ] Released as a minor bump of dev-workflow

## Notes

## Learnings

## Progress Log

- [2026-10-07] Created
- [2026-10-08] Started