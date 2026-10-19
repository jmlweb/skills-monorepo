---
id: TSK-054
title: Fix: Skills put user text in double-quoted CLI args without a phrasing rule
status: pending
priority: P3
tags: []
created: 2026-10-19
source: report/RPT-009
depends-on: []
---

# Fix: Skills put user text in double-quoted CLI args without a phrasing rule

## Description

Only kickstart tells the model how to phrase `{{VALUE}}`s that sit inside double quotes (no `"`, `$` or backticks). Other flowstate skills interpolate user text the same way with no rule, so a `$` or backtick in a title or block reason expands and a `"` breaks the command.

Found by `grep -rnE '"\{\{[A-Z_]+\}\}"' plugins/*/skills` on 2026-10-18: 29 sites in add-learning, add-task, block-task, complete-task, idea, learnings, next-task, parallel, report, retro, review-idea, setup, start-task, triage-report. Some are IDs or paths and are safe.

### Expected
Each free-text value either goes through `--body -` with a quoted heredoc or has the phrasing rule beside the command (docs/writing-skills.md "Shell values in skill commands"). Add a lint-skills check for double-quoted placeholders whose names are not ID or path tokens, so the gap stays closed.

## Acceptance Criteria

- [ ] lint-skills flags double-quoted placeholders whose names are not ID or path tokens
- [ ] Every free-text value in flowstate skills goes through --body - with a quoted heredoc or has the phrasing rule beside the command
- [ ] pnpm lint:skills passes

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created