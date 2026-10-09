---
id: LRN-024
title: Agent worktrees can branch from a stale commit missing tooling
status: active
tags: [worktree, tooling, lint-skills, parallel]
task: TSK-034
created: 2026-10-09
---

## Context
Parallel audit worktrees (TSK-033/034/035) were cut from an older commit than main: no lint:skills, routing-eval, evals/, deslop, or docs sections 6/7, and older skill frontmatter.
## Insight
Acceptance criteria can reference tooling absent from the branch the agent starts on. Skills read before a base update may be outdated, and rewrites can clobber newer main changes.
## Application
Tell subagents to run `git merge --ff-only main` and `pnpm install` first, or check `merge-base --is-ancestor main <branch>` when collecting results. Verify each returned branch contains main before merging.
