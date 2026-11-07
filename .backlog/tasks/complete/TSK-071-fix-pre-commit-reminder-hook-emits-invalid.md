---
id: TSK-071
title: Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote
status: complete
priority: P4
tags: [flowstate, hooks]
created: 2026-11-01
source: report/RPT-023
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote

## Description

From RPT-023. `plugins/flowstate/hooks/pre-commit-reminder.sh:49-51` interpolates raw task titles into a JSON heredoc. A CLI-created title like `Handle "draft" PRs` makes the hook print invalid JSON, so the pre-commit reminder is lost.

Related: TSK-070 (RPT-022) touches the same output line; do both together if convenient.

## Acceptance Criteria

- [x] pre-commit-reminder.sh prints valid JSON when an active task title contains a double quote or a backslash — evidence: title Handle "draft" PRs on C:\repo yields valid JSON (old script: jq parse error) (2026-11-07)
- [x] The output is built with jq rather than heredoc interpolation
- [x] A script test covers a quoted title; pnpm test passes

## Notes

## Learnings

- LRN-054: Worktree isolation guard inspects command text: any payload mentioning git is refused
## Progress Log

- [2026-11-01] Created
- [2026-11-07] Started
- [2026-11-07] Merged c21e89a into main; jq -n --arg builds the output.
- [2026-11-07] Completed