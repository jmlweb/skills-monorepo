---
id: TSK-033
title: Audit flowstate and repo-local skills against writing rules
status: pending
priority: P3
tags: [writing-rules, audit, flowstate]
created: 2026-10-08
source: plan/PLN-013
depends-on: [TSK-028, TSK-032, TSK-041]
---

# Audit flowstate and repo-local skills against writing rules

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

## Progress Log

- [2026-10-08] Created