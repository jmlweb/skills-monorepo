---
id: RPT-009
title: Skills put user text in double-quoted CLI args without a phrasing rule
type: improvement
severity: medium
status: pending
created: 2026-10-18
---

## Description
Only kickstart tells the model how to phrase `{{VALUE}}`s that sit inside double quotes (no `"`, `$` or backticks). Other flowstate skills interpolate user text the same way with no rule, so a `$` or backtick in a title or block reason expands and a `"` breaks the command. Found by `grep -rnE '"\{\{[A-Z_]+\}\}"' plugins/*/skills` on 2026-10-18: add-learning, add-task, block-task, complete-task, idea, learnings, next-task, parallel, report, retro, review-idea, setup, start-task, triage-report (1-3 sites each; some are IDs or paths and are safe).

## Expected
Each free-text value either goes through `--body -` with a quoted heredoc or has the phrasing rule beside the command (docs/writing-skills.md "Shell values in skill commands"). A lint-skills check could flag double-quoted placeholders whose names are not ID or path tokens.
