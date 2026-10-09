---
id: LRN-017
title: Worktree agents' git calls are refused when the guard cannot prove the command is not git
status: active
tags: [worktree, rtk, git, tooling]
task: TSK-038
created: 2026-10-08
---

## Context
A compound shell command (loop with a computed `node` argument) and a command that merely mentioned `.github/` were refused by the worktree isolation guard.
## Insight
The guard refuses any command it cannot prove is not git: `-C` redirects, rtk-wrapped commands, loops over variables, paths containing `git`. Extends LRN-008.
## Application
Run plain, separate commands and call `/usr/bin/git` for git.
