---
id: LRN-072
title: Root pnpm build/test fail with turbo 'Exec format error' on the hustle box; run per-plugin scripts
status: active
tags: [tooling, turbo, ci]
task: TSK-089
created: 2026-11-25
---

On the hustle mini PC, `pnpm build` / `pnpm test` / `pnpm typecheck` from the repo root fail with turbo "unable to spawn child process: Exec format error (os error 8)" for every package, unrelated to the code. Running `pnpm run build`, `pnpm exec tsc --noEmit` and `pnpm exec vitest run` inside each `plugins/<name>` dir, plus `node --test scripts/*.test.mjs`, covers the same gates and works.
