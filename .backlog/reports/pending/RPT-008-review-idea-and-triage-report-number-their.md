---
id: RPT-008
title: review-idea and triage-report number their decision menus after a numbered list
type: bug
severity: medium
status: pending
created: 2026-10-18
---

## Description
review-idea step 4 lists the revise changes as a numbered list, then offers Approve/Discard/Revise as `1.`-`3.`. The terminal renders both as one list, so the menu shows as 6-8 and the user's pick reads as out of range. Observed in session ce41e526 (2026-10-08): the user picked 8 (Revise) and was told it was not an option. triage-report step 4 uses the same numbered menu (`1. **Convert to task**` … `4. **Stop**`).

## Expected
Menus labelled with letters or bold words, per docs/writing-skills.md "Menus in skill output".

## Files
- plugins/flowstate/skills/review-idea/SKILL.md (menu near "Then list the override options")
- plugins/flowstate/skills/triage-report/SKILL.md (menu lines 76-79)
