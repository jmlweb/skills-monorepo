---
id: LRN-062
title: Compare CLI-printed paths by suffix in integration tests: the CLI prints realpath
status: active
tags: [flowstate, testing, macos, paths]
task: TSK-074
created: 2026-11-07
---

## Context
TSK-074 plain-output test compared the full path printed by `task-doctor` with `join(tmp, ...)`.

## Insight
The CLI resolves the backlog through realpath (`/private/var/...`) while `mkdtemp` returns `/var/...` (LRN-036 again, now on stdout rather than the registry).

## Application
Assert `toMatch(/\/tasks\/complete\/TSK-001-x\.md$/)` on paths the CLI prints; keep exact equality for the other cells.
