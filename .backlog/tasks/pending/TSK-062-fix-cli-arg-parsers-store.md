---
id: TSK-062
title: Fix: CLI arg parsers store true for flag values that are empty or start with --
status: pending
priority: P3
tags: []
created: 2026-10-24
source: report/RPT-014
depends-on: []
---

# Fix: CLI arg parsers store true for flag values that are empty or start with --

## Description

### Context

From RPT-014. `parseArgs` in `plugins/flowstate/src/bin/flowstate.ts:193` treats an empty or `--`-prefixed value as a missing value and stores `"true"`. `required()` at line 239 accepts `"true"` and whitespace. Result: entities titled `true`, Progress Log lines reading `true`, exit 0. The same parser shape exists in `plugins/dev-workflow/src/bin/dev-workflow.ts:93` and `plugins/atlassian-polish/src/bin/atlassian-polish.ts:45`.

Related but distinct: TSK-054 (skill phrasing rule for quoted args), TSK-060 (pipe/newline in titles).

## Acceptance Criteria

- [ ] flowstate task-create --title "--x" and --title "" no longer write an entity titled true: the value is taken literally or the command exits non-zero with an actionable error
- [ ] Blank or whitespace-only --title fails validation in task-create, idea-create, report-create and learning-create
- [ ] task-update --log with a value starting with -- records the text or errors, never logs true
- [ ] dev-workflow and atlassian-polish parsers get the same fix or a documented reason they do not need it
- [ ] Regression tests cover empty, whitespace-only and --prefixed flag values; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-10-24] Created