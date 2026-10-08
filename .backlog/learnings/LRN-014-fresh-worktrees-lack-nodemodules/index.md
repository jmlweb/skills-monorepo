---
id: LRN-014
title: Fresh worktrees lack node_modules
status: active
tags: [tooling, worktree, testing]
task: TSK-045
created: 2026-10-08
---

## Context
pnpm test in a fresh worktree fails at the turbo build step.
## Insight
Run `node --test scripts/*.test.mjs` directly, or pnpm install first.
## Application
Check this before trusting a red pnpm test in a worktree.
