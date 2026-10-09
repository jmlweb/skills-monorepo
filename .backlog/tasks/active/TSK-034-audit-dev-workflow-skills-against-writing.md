---
id: TSK-034
title: Audit dev-workflow skills against writing rules
status: active
priority: P3
tags: [writing-rules, audit, dev-workflow]
created: 2026-10-08
source: plan/PLN-013
depends-on: [TSK-028, TSK-032, TSK-041]
started: 2026-10-09
---

# Audit dev-workflow skills against writing rules

## Description

## Goal
Apply docs/writing-skills.md to this plugin's skills.

## Approach
Steps 4-7 of PLN-013. Depends on the rules task and TSK-028.


## Acceptance Criteria

- [ ] Every SKILL.md in scope audited for no-ops, unpaired prohibitions, steps without completion criteria, and reference to disclose
- [ ] Each slimmed skill verified by one real invocation compared with pre-slim behaviour, logged in Progress Log
- [ ] No SKILL.md exceeds 150 lines
- [ ] Plugin bumped via pnpm bump patch; claude plugin validate . and pnpm test pass
- [ ] Started only after TSK-028 is complete

## Notes

## Learnings

- LRN-024: Agent worktrees can branch from a stale commit missing tooling
- LRN-025: Worktree guard rejects rtk-rewritten git; use /usr/bin/git
- LRN-026: Routing eval breaks when description rewrites drop legacy trigger words
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Scope added from discarded PLN-019 (agent-handoff): add a rule that Goal/Constraints must not restate what the Links section already covers; add an optional, conditional 'Suggested skills' section to the out template (e.g. 'if flowstate is installed, /flowstate:start-task <ID>').
- [2026-10-08] TSK-041: audit also rewrites workflow-summary descriptions to the docs/writing-skills.md section 6 shape and considers a section 7 Rationalizations table for discipline skills.
- [2026-10-08] Audit ends by clearing its plugin's pnpm lint:skills warnings (TSK-038); a follow-up flips CI to --strict.
- [2026-10-09] Started