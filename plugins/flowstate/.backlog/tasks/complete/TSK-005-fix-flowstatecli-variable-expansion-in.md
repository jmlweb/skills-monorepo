---
id: TSK-005
title: Fix FLOWSTATE_CLI variable expansion in zsh shells
status: complete
priority: P1
tags: []
created: 2026-04-06
source: report/email-analyzer-usage
depends-on: []
started: 2026-04-06
completed: 2026-04-06
---

# Fix FLOWSTATE_CLI variable expansion in zsh shells

## Description

All 15 skill templates define FLOWSTATE_CLI as a variable and then invoke it via $FLOWSTATE_CLI. In zsh, unquoted variable expansion does NOT perform word splitting — the entire string is treated as a single command name, causing 'no such file or directory' errors. Affected files: every SKILL.md under skills/ that uses the pattern. Fix options: (a) use eval, (b) use an array variable, or (c) rewrite templates to call node path/to/flowstate.js directly without a variable.

## Acceptance Criteria

- [ ] All skill templates use direct command invocation instead of variable expansion
- [ ] Skills work correctly in zsh (the default macOS and common Linux shell)
- [ ] Existing tests pass

## Notes

## Learnings

## Progress Log

- [2026-04-06] Created
- [2026-04-06] Started
- [2026-04-06] Completed