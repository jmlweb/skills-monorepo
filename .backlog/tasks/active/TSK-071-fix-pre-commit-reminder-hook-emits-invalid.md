---
id: TSK-071
title: Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote
status: active
priority: P4
tags: [flowstate, hooks]
created: 2026-11-01
source: report/RPT-023
depends-on: []
started: 2026-11-07
---

# Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote

## Description

From RPT-023. `plugins/flowstate/hooks/pre-commit-reminder.sh:49-51` interpolates raw task titles into a JSON heredoc. A CLI-created title like `Handle "draft" PRs` makes the hook print invalid JSON, so the pre-commit reminder is lost.

Related: TSK-070 (RPT-022) touches the same output line; do both together if convenient.

## Acceptance Criteria

- [ ] pre-commit-reminder.sh prints valid JSON when an active task title contains a double quote or a backslash
- [ ] The output is built with jq rather than heredoc interpolation
- [ ] A script test covers a quoted title; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-11-01] Created
- [2026-11-07] Started