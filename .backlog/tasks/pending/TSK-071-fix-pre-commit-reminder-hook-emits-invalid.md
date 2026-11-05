---
id: TSK-071
title: Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote
status: pending
priority: P4
tags: []
created: 2026-11-01
source: report/RPT-023
depends-on: []
---

# Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote

## Description

### Description
From RPT-023. `plugins/flowstate/hooks/pre-commit-reminder.sh:59-66` interpolates raw task titles into a JSON heredoc. A CLI-created title like `Handle "draft" PRs` makes the hook print invalid JSON, so the pre-commit reminder is lost.

Related: TSK for RPT-022 touches the same output line; do both together if convenient.

## Acceptance Criteria

- [ ] pre-commit-reminder.sh prints valid JSON when an active task title contains a double quote or a backslash
- [ ] The output is built with jq rather than heredoc interpolation
- [ ] A script test covers a quoted title; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-11-01] Created