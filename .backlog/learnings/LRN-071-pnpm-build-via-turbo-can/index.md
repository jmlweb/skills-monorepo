---
id: LRN-071
title: pnpm build via turbo can fail with Exec format error; run per-package scripts with pnpm -r
status: active
tags: [tooling, turbo, build]
task: TSK-086
created: 2026-11-22
---

On the hustle Linux host, `pnpm build` (turbo 2.11.10) fails before running any task with
`unable to spawn child process: Exec format error (os error 8)`, while `pnpm build` inside a
single plugin dir (plain `tsc`) works. Equivalent gate without turbo:
`pnpm -r --filter './plugins/*' run build|typecheck|test` plus `node --test scripts/*.test.mjs`.
The cause is turbo's process spawning on this host, not the repo code.
