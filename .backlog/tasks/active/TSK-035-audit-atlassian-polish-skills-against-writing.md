---
id: TSK-035
title: Audit atlassian-polish skills against writing rules
status: active
priority: P3
tags: [writing-rules, audit, atlassian-polish]
created: 2026-10-08
source: plan/PLN-013
depends-on: [TSK-028, TSK-032, TSK-041]
started: 2026-10-09
---

# Audit atlassian-polish skills against writing rules

## Description

## Goal
Apply docs/writing-skills.md to this plugin's skills.

## Approach
Steps 4-7 of PLN-013. Depends on the rules task and TSK-028.
Also: bring polish-atlassian/SKILL.md (243 lines) under 150 by disclosing detail into references/.


## Acceptance Criteria

- [ ] Every SKILL.md in scope audited for no-ops, unpaired prohibitions, steps without completion criteria, and reference to disclose
- [ ] Each slimmed skill verified by one real invocation compared with pre-slim behaviour, logged in Progress Log
- [ ] No SKILL.md exceeds 150 lines
- [ ] Plugin bumped via pnpm bump patch; claude plugin validate . and pnpm test pass
- [ ] Started only after TSK-028 is complete

## Notes

## Learnings

- LRN-027: lint:skills counts body lines excluding frontmatter
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Backlog grooming: priority P2 -> P3 to match sibling audits TSK-033/034; depends-on set to TSK-028, TSK-032, TSK-041.
- [2026-10-08] TSK-041: audit also rewrites workflow-summary descriptions to the docs/writing-skills.md section 6 shape and considers a section 7 Rationalizations table for discipline skills.
- [2026-10-08] Audit ends by clearing its plugin's pnpm lint:skills warnings (TSK-038); a follow-up flips CI to --strict.
- [2026-10-09] Started