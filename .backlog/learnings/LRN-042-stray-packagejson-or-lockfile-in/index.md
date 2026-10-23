---
id: LRN-042
title: Stray package.json or lockfile in a parent dir breaks the suite; turbo drops TMPDIR
status: active
tags: [testing, tooling, turbo, vitest]
task: TSK-056
created: 2026-10-20
---

A clone under `/tmp` with an empty `/tmp/package.json` fails `pnpm test`: esbuild (vitest config load) and Node's ESM loader walk up to it and reject the empty JSON. An empty `/tmp/pnpm-lock.yaml` also flips `detect-test-runner`'s ancestor lockfile check from yarn to pnpm.

Setting `TMPDIR` does not help under `pnpm test`, because turbo does not pass it through to tasks. Fix: copy the repo outside `/tmp` and run each suite directly with `TMPDIR` set (`pnpm vitest run` per plugin, `node --test scripts/*.test.mjs`).
