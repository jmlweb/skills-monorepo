---
id: LRN-022
title: tsc never deletes dist outputs whose source vanished, and turbo cache restores them
status: active
tags: [dist, build, turbo, ci]
task: TSK-048
created: 2026-10-09
---

## Context
TSK-048 found plugins/flowstate/dist/commands/{init,plan-create,plan-move}.js committed long after their sources were renamed. After `git rm`, a local `pnpm build` or `pnpm test` restored them as untracked files.

## Insight
A rebuild only adds or overwrites files, so stale artifacts survive it and the CI dist-drift gate. Turbo's local cache replays cached dist outputs, which brings deleted files back as untracked. Stale tracked .d.ts files (init.d.ts, plan-create.d.ts, plan-move.d.ts) also remain and are not flagged by `pnpm names:check`.

## Application
After renaming or removing a CLI module, `git rm` its dist .js and .d.ts in the same change. If names:check fails locally on untracked dist files, `git clean` them or run with `--force`; CI starts from a clean checkout.
