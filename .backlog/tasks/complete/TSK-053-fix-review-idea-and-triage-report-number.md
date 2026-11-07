---
id: TSK-053
title: Fix: review-idea and triage-report number their decision menus after a numbered list
status: complete
priority: P3
tags: [flowstate, skill, menus]
created: 2026-10-19
source: report/RPT-008
depends-on: []
started: 2026-10-19
completed: 2026-11-07
condensed: true
---

# Fix: review-idea and triage-report number their decision menus after a numbered list

## Description

review-idea step 4 lists the revise changes as a numbered list, then offers Approve/Discard/Revise/Stop as `1.`-`4.`. The terminal renders both as one list, so the menu shows as 6-8 and the user's pick reads as out of range. Observed in session ce41e526 (2026-10-08): the user picked 8 (Revise) and was told it was not an option. triage-report step 4 uses the same numbered menu.

### Files
- plugins/flowstate/skills/review-idea/SKILL.md (lines 85-88)
- plugins/flowstate/skills/triage-report/SKILL.md (lines 76-79)

## Acceptance Criteria

- [x] review-idea decision menu uses letters or bold words, not numbers — evidence: plugins/flowstate/skills/review-idea/SKILL.md:85-88 → lettered A-D menu, fixed in b3d5341 (2026-11-07)
- [x] triage-report decision menu uses letters or bold words, not numbers — evidence: plugins/flowstate/skills/triage-report/SKILL.md → lettered A-D menu, fixed in b3d5341 (2026-11-07)
- [x] Menus follow docs/writing-skills.md "Menus in skill output" — evidence: docs/writing-skills.md section Menus in skill output → both menus use letters (2026-11-07)
- [x] pnpm lint:skills passes — evidence: pnpm lint:skills → 0 errors, 0 warnings (2026-11-07)

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created
- [2026-11-07] Completed
- [2026-11-07] Condensed
- [2026-11-07] Closed by check-task sweep: fixed by b3d5341 on 2026-10-20
