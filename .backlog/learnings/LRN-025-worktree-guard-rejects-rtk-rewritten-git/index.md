---
id: LRN-025
title: Worktree guard rejects rtk-rewritten git; use /usr/bin/git
status: active
tags: [worktree, git, rtk]
task: TSK-034
created: 2026-10-09
---

## Context
In isolated worktree agents, plain `git` gets rewritten to `rtk git` and the worktree guard refuses it, especially with pipes or long heredocs mentioning git.
## Insight
`/usr/bin/git` with no -C works; long edit scripts work better as files in the scratchpad than heredocs.
## Application
Instruct worktree subagents to use `/usr/bin/git`, single plain commands, no pipes (consistent with LRN-019).
