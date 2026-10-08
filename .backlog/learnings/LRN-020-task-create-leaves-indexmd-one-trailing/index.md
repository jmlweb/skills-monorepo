---
id: LRN-020
title: task-create leaves index.md one trailing line short of index-rebuild output
status: active
tags: [flowstate, index, ci, testing]
task: TSK-047
created: 2026-10-08
---

## Context
TSK-047 added scripts/check-backlog-integrity.mjs, which compares each index.md with a copy rebuilt by `index-rebuild`.

## Insight
Verified in a temp backlog: after `setup` plus `task-create`, `tasks/index.md` differs from the `index-rebuild` output by a trailing blank line. The check passes on the repo today only because the index was rebuilt after the last mutation. A commit that creates tasks through the CLI without a rebuild would fail `pnpm backlog:check` in CI.

## Application
Run `index-rebuild` before committing backlog changes, and after seeding test fixtures compared against rebuild output. If the CI step proves noisy, make task-create write the same trailing line as index-rebuild.
