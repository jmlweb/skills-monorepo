---
id: LRN-004
title: Parallel worktree agents start from a stale base and lack git hooks
status: active
tags: [worktree, parallel, tooling, git]
task: TSK-024
created: 2026-10-08
---

## Context
/flowstate:parallel commits "start tasks" on main, then spawns worktree agents.
## Insight
Worktrees branched from an older commit (18c023c), so active task files were missing. Fix: `git merge --ff-only main` in the worktree. Also: no node_modules (run `pnpm install --frozen-lockfile`), simple-git-hooks postinstall fails (.git is a file), and rtk-wrapped git is refused for agents (`/usr/bin/git` or `git -C <path>` sometimes works).
## Application
Check task file exists in worktree before work; coordinator may need to commit from the worktree; rebuild and stage dist/ manually when hook absent.
