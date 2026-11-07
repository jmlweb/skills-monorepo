---
id: TSK-033
title: Audit flowstate and repo-local skills against writing rules
status: complete
priority: P3
tags: [writing-rules, audit, flowstate]
created: 2026-10-08
source: idea/PLN-013
depends-on: [TSK-028, TSK-032, TSK-041]
started: 2026-10-09
completed: 2026-10-11
condensed: true
---

# Audit flowstate and repo-local skills against writing rules

## Description

## Goal
Apply docs/writing-skills.md to this plugin's skills.

## Approach
Steps 4-7 of PLN-013. Depends on the rules task and TSK-028.


## Acceptance Criteria

- [x] Every SKILL.md in scope audited for no-ops, unpaired prohibitions, steps without completion criteria, and reference to disclose — evidence: sandbox audit of 18 skills, see Progress Log (2026-10-11)
- [x] Each slimmed skill verified by one real invocation compared with pre-slim behaviour, logged in Progress Log — evidence: sandbox walk vs 8607a4e^ per skill; parallel dry-run only (2026-10-11)
- [x] No SKILL.md exceeds 150 lines — evidence: wc -l: max 150 (parallel) (2026-10-11)
- [x] Plugin bumped via pnpm bump patch; claude plugin validate . and pnpm test pass — evidence: pnpm bump patch; validate + pnpm test exit 0 (2026-10-11)
- [x] Started only after TSK-028 is complete — evidence: TSK-028 in tasks/complete (2026-10-11)

## Notes

## Learnings

- LRN-028: Re-merge a stale skill audit by taking main's files and replaying edits
- LRN-029: Piping pnpm bump to head can abort the bump via SIGPIPE
## Progress Log

- [2026-10-08] Created
- [2026-10-11] Completed
- [2026-11-07] Condensed
