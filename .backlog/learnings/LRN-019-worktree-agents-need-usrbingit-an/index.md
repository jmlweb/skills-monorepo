---
id: LRN-019
title: Worktree subagents: rtk-safe git, install first, sync the base, plain commands
status: active
tags: [worktree, parallel, tooling, rtk, git, pnpm]
task: TSK-043
created: 2026-10-08
---

## Context
Consolidates LRN-004, 008, 010, 013, 014, 017, 021, 024 and 025, all from flowstate:parallel runs with `isolation: worktree` on 2026-10-08/09 (TSK-024 to TSK-046). The isolation guard cost about 158 refused calls across 7 sessions.

## Insight
- **Git:** the user's rtk hook rewrites `git` to `rtk git`, and the worktree guard refuses any command it cannot prove is not git: rtk-wrapped commands, `-C` redirects, loops over variables, paths containing `git`. Plain `/usr/bin/git …` from the worktree cwd usually works; late in a session even that was refused. rtk is this machine's setup, not a plugin user's.
- **Commands:** shell variables, globs, grep alternations, pipes and heredocs chained with other commands trip the guard. One plain command per call with literal absolute paths runs. Write files with Write/Edit or as scratchpad scripts, not heredocs.
- **Install:** a fresh worktree has no node_modules; `pnpm install --frozen-lockfile` (add `--ignore-scripts` if postinstall fails) fixes typecheck, build and test. `node --test scripts/*.test.mjs` runs without an install.
- **Hooks:** simple-git-hooks postinstall fails with ENOTDIR because `.git` is a file in a worktree. Observations conflict on whether the pre-commit dist rebuild still fires (LRN-008 yes, LRN-010 no), so treat it as absent.
- **Base:** worktrees branched from an older commit than HEAD (18c023c, 86d2095), so task files, `shared/`, lint-skills and routing-eval were missing, and rewrites could clobber newer main changes.

## Application
In the subagent prompt: run `/usr/bin/git merge --ff-only main` and `pnpm install --frozen-lockfile` first; use `/usr/bin/git` with no `-C`; one plain command per Bash call; run `pnpm build` and stage `dist/` by hand; if git is refused, leave the commit to the coordinator. When collecting: check `git merge-base --is-ancestor main <branch>` before merging, re-run lint:skills, routing-eval, version:sync and the dist drift check on main, then remove the worktree and its branch (agent-playbook mistake 29).
