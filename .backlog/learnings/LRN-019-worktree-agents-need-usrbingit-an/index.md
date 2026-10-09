---
id: LRN-019
title: Worktree agents need /usr/bin/git, an install, and may start from a stale base
status: active
tags: [worktree, parallel, tooling, rtk]
task: TSK-043
created: 2026-10-08
---

## Context
Three flowstate:parallel subagents ran with worktree isolation (TSK-026, TSK-043, TSK-046).

## Insight
The rtk hook rewrites `git` to `rtk git` and the worktree guard refuses it, so agents must call `/usr/bin/git -C <worktree>`. A fresh worktree has no node_modules; `pnpm install --frozen-lockfile --ignore-scripts` fixes typecheck, build and test. The worktrees branched from an older commit (86d2095), not the HEAD that held the task moves, so the agent lacked lint-skills and routing-eval and could not run them.

## Application
Tell worktree agents to use `/usr/bin/git` and install first. After merging, re-run lint:skills, routing-eval, version:check and the dist drift check on main, since agents could not run them all.
