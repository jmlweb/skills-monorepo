---
id: TSK-004
title: Add plugin hooks for proactive flowstate behavior
status: complete
priority: P4
tags: [feature, plugin, hooks]
created: 2026-04-05
source: manual
depends-on: []
started: 2026-04-05
completed: 2026-04-05
---

# Add plugin hooks for proactive flowstate behavior

## Description

Investigate and implement plugin hooks (hooks.json) for proactive behavior:

- PostToolUse on test failure: suggest /flowstate:report
- PostToolUse on Write/Edit: check for active tasks matching changed files
- PreToolUse on Bash(git commit): remind about active tasks

This would make flowstate more proactive without relying solely on SKILL.md instructions.


## Acceptance Criteria



## Notes

## Learnings

## Progress Log

- [2026-04-05] Created
- [2026-04-05] Started
- [2026-04-05] Completed