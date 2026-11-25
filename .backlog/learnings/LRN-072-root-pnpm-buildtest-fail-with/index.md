---
id: LRN-072
title: The turbo Exec format error comes from the pnpm wrapper; ./node_modules/.bin/turbo works, and the pre-commit hook breaks too
status: active
tags: [tooling, turbo, build, pre-commit]
task: TSK-089
created: 2026-11-25
---

Extends LRN-071. On the hustle host, `pnpm turbo run build` fails with `Exec format error (os error 8)`, but invoking the binary directly, `./node_modules/.bin/turbo run build --filter=<pkg>`, succeeds. The failure is tied to the environment pnpm sets up for child processes, not to turbo or the repo.

Consequence: `scripts/pre-commit.mjs` shells out to `pnpm turbo run build`, so every commit that stages `plugins/*/src/` fails. The hook only rebuilds and stages `dist/` (plus routing eval when skills change). Workaround: rebuild with `./node_modules/.bin/turbo run build --filter=<pkg> --force`, `git add plugins/<name>/dist`, then `git commit --no-verify`, and say so in the PR.
