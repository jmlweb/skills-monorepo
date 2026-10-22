---
id: LRN-041
title: task-block leaves tasks/index.md stale, which fails pnpm backlog:check in CI
status: active
tags: [flowstate, backlog, ci]
task: TSK-057
created: 2026-10-22
---

`task-block` (CLI 2.18.2) writes `status: blocked` into the task file but does not rebuild `tasks/index.md`; only `task-move` rebuilds it. `scripts/check-backlog-integrity.mjs` (`pnpm backlog:check`, a CI step) compares the index with a fresh `index-rebuild`, so a commit that blocks a task fails CI with "differs from 'flowstate index-rebuild' output (hand-edited?)".

Workaround: run `flowstate index-rebuild --type tasks` after `task-block` and before committing. The same holds for any CLI command that changes status without a move (`task-unblock`).
