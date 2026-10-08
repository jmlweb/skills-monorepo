---
id: LRN-013
title: Worktree agents cannot run git through the rtk hook
status: active
tags: [tooling, worktree, rtk, git]
task: TSK-044
created: 2026-10-08
---

## Context
Worktree-isolated agents had every Bash command containing `git` rewritten to `rtk git ...`, then refused by the isolation guard (-C, cd &&, command git all failed).
## Insight
Refusal fires whenever a command contains git. Read-only non-git commands and Write/Edit still work.
## Application
Tell worktree agents up front that the parent commits their work, or exempt git from the rtk rewrite for isolated agents.
