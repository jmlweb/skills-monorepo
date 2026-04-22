---
id: TSK-006
title: Document --criteria flag format in triage-report and review-plan skills
status: complete
priority: P3
tags: []
created: 2026-04-06
source: report/email-analyzer-usage
depends-on: []
started: 2026-04-06
completed: 2026-04-06
---

# Document --criteria flag format in triage-report and review-plan skills

## Description

The --criteria flag in task-create expects a JSON array but the skill templates for triage-report (line 54) and review-plan (line 62) use a plain placeholder without specifying the format. This caused Claude to pass semicolon-separated strings, triggering JSON parse errors. Affected files: skills/triage-report/SKILL.md, skills/review-plan/SKILL.md. Fix: add a comment or example showing the expected format, e.g. --criteria '["criterion 1","criterion 2"]'.

## Acceptance Criteria

- [ ] triage-report/SKILL.md documents that --criteria expects a JSON array
- [ ] review-plan/SKILL.md documents that --criteria expects a JSON array
- [ ] add-task/SKILL.md already shows JSON format (verify consistency)
- [ ] Existing tests pass

## Notes

## Learnings

## Progress Log

- [2026-04-06] Created
- [2026-04-06] Started
- [2026-04-06] Completed