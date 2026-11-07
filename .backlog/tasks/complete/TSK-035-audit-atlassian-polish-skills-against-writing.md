---
id: TSK-035
title: Audit atlassian-polish skills against writing rules
status: complete
priority: P3
tags: [writing-rules, audit, atlassian-polish]
created: 2026-10-08
source: idea/PLN-013
depends-on: [TSK-028, TSK-032, TSK-041]
started: 2026-10-09
completed: 2026-10-15
condensed: true
---

# Audit atlassian-polish skills against writing rules

## Description

## Goal
Apply docs/writing-skills.md to this plugin's skills.

## Approach
Steps 4-7 of PLN-013. Depends on the rules task and TSK-028.
Also: bring polish-atlassian/SKILL.md (243 lines) under 150 by disclosing detail into references/.


## Acceptance Criteria

- [x] Every SKILL.md in scope audited for no-ops, unpaired prohibitions, steps without completion criteria, and reference to disclose — evidence: manual: commit 62e507d audits atlassian-setup + polish-atlassian, detail disclosed to references/; lint:skills → 0 warnings (2026-10-15) (2026-10-15)
- [ ] Each slimmed skill verified by one real invocation compared with pre-slim behaviour, logged in Progress Log
- [x] No SKILL.md exceeds 150 lines — evidence: wc -l → atlassian-setup 137, polish-atlassian 148 incl. frontmatter (2026-10-15) (2026-10-15)
- [x] Plugin bumped via pnpm bump patch; claude plugin validate . and pnpm test pass — evidence: bumped in 62e507d, released v0.9.2 (9dcfa7d); claude plugin validate . → passed; pnpm test → 7/7 tasks ok (2026-10-15) (2026-10-15)
- [x] Started only after TSK-028 is complete — evidence: manual: TSK-028, TSK-032, TSK-041 in tasks/complete/ (2026-10-15) (2026-10-15)

## Notes

## Learnings

- LRN-027: lint:skills counts body lines excluding frontmatter
## Progress Log

- [2026-10-08] Created
- [2026-10-15] Completed
- [2026-11-07] Condensed
