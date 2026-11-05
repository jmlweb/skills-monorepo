---
id: TSK-054
title: Fix: Skills put user text in double-quoted CLI args without a phrasing rule
status: complete
priority: P3
tags: []
created: 2026-10-19
source: report/RPT-009
depends-on: []
started: 2026-10-24
completed: 2026-10-24
---

# Fix: Skills put user text in double-quoted CLI args without a phrasing rule

## Description

Only kickstart tells the model how to phrase `{{VALUE}}`s that sit inside double quotes (no `"`, `$` or backticks). Other flowstate skills interpolate user text the same way with no rule, so a `$` or backtick in a title or block reason expands and a `"` breaks the command.

Found by `grep -rnE '"\{\{[A-Z_]+\}\}"' plugins/*/skills` on 2026-10-18: 29 sites in add-learning, add-task, block-task, complete-task, idea, learnings, next-task, parallel, report, retro, review-idea, setup, start-task, triage-report. Some are IDs or paths and are safe.

### Expected
Each free-text value either goes through `--body -` with a quoted heredoc or has the phrasing rule beside the command (docs/writing-skills.md "Shell values in skill commands"). Add a lint-skills check for double-quoted placeholders whose names are not ID or path tokens, so the gap stays closed.

## Acceptance Criteria

- [x] lint-skills flags double-quoted placeholders whose names are not ID or path tokens — evidence: node --test scripts/lint-skills.test.mjs → 7 shell-quoted-text tests pass (3 failed before the rule) (2026-10-24)
- [x] Every free-text value in flowstate skills goes through --body - with a quoted heredoc or has the phrasing rule beside the command — evidence: pnpm lint:skills --strict → 0 shell-quoted-text findings (30 before the skill fixes) (2026-10-24)
- [x] pnpm lint:skills passes — evidence: pnpm lint:skills --strict → 0 error(s), 0 warning(s) (2026-10-24)

## Notes

## Learnings

- LRN-044: Lint double-quoted skill placeholders per section, skipping fences and heredocs
## Progress Log

- [2026-10-19] Created
- [2026-10-24] Started
- [2026-10-24] criterion 1 — evidence: node --test scripts/lint-skills.test.mjs → 7 new shell-quoted-text tests pass (3 failed before the rule); rule flagged 30 unguarded sites before the skill fixes (2026-10-24)
- [2026-10-24] criterion 2 — evidence: pnpm lint:skills --strict → 0 shell-quoted-text findings across 15 flowstate skills; {{DEPS}} renamed {{DEP_IDS}} (2026-10-24)
- [2026-10-24] criterion 3 — evidence: pnpm lint:skills --strict → 0 error(s), 0 warning(s); pnpm test → exit 0 (2026-10-24)
- [2026-10-24] Completed