---
id: LRN-023
title: pnpm bump only works inside the plugin dir
status: active
tags: [release, pnpm, tooling]
task: TSK-036
created: 2026-10-09
---

## Context
Running `pnpm bump patch` from the repo root fails with ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL.

## Insight
The bump script is defined per plugin, not at the root.

## Application
Use `pnpm --dir plugins/<name> bump <level>` from the root or from a worktree.
