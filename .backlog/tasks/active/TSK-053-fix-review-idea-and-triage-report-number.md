---
id: TSK-053
title: Fix: review-idea and triage-report number their decision menus after a numbered list
status: active
priority: P3
tags: []
created: 2026-10-19
source: report/RPT-008
depends-on: []
started: 2026-10-19
---

# Fix: review-idea and triage-report number their decision menus after a numbered list

## Description

review-idea step 4 lists the revise changes as a numbered list, then offers Approve/Discard/Revise/Stop as `1.`-`4.`. The terminal renders both as one list, so the menu shows as 6-8 and the user's pick reads as out of range. Observed in session ce41e526 (2026-10-08): the user picked 8 (Revise) and was told it was not an option. triage-report step 4 uses the same numbered menu.

### Files
- plugins/flowstate/skills/review-idea/SKILL.md (lines 85-88)
- plugins/flowstate/skills/triage-report/SKILL.md (lines 76-79)

## Acceptance Criteria

- [ ] review-idea decision menu uses letters or bold words, not numbers
- [ ] triage-report decision menu uses letters or bold words, not numbers
- [ ] Menus follow docs/writing-skills.md "Menus in skill output"
- [ ] pnpm lint:skills passes

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created
- [2026-10-19] Started