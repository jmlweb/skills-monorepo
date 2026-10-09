---
id: LRN-010
title: Worktree agents: use /usr/bin/git, pnpm install first, hooks don't run
status: active
tags: [worktree, git, rtk, pnpm, tooling]
task: TSK-030
created: 2026-10-08
---

## Context
Isolated worktree agents (TSK-030, TSK-041, TSK-039) had plain `git` refused by the rtk hook, `pnpm test` failing on missing node_modules, and the pre-commit hook silently absent.
## Insight
rtk rewrites `git ...` and the worktree guard then refuses it; `/usr/bin/git` as a plain command works, though late in a session even that may be refused. Worktrees don't share node_modules. simple-git-hooks postinstall fails with ENOTDIR because `.git` is a file, so the pre-commit dist rebuild never runs.
## Application
Run `pnpm install --frozen-lockfile` first. Use `/usr/bin/git`. After editing `src/`, run `pnpm build` and stage `dist/` by hand. If git is refused, hand the commit back to the coordinator.
