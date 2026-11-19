---
id: TSK-085
title: Fix: flowstate CLI rejects unknown flags that carry a value
status: complete
priority: P3
tags: [cli, args, flowstate]
created: 2026-11-10
source: report/RPT-030
depends-on: []
started: 2026-11-19
completed: 2026-11-19
---

# Fix: flowstate CLI rejects unknown flags that carry a value

## Description

parseArgs (plugins/flowstate/src/core/args.ts:13-37) keeps any --key value pair, so misspelt flags are dropped silently with exit 0. Add per-command allowlists. See RPT-030 for reproductions.

## Acceptance Criteria

- [x] Each flowstate command validates flags against its accepted set and fails with exit 1 naming the unknown flag
- [x] task-create --tag x and task-update --tick 1 fail instead of exiting 0
- [x] Every flag used by flowstate skills is still accepted (grep skills for flags)
- [x] Tests cover an unknown valued flag on at least task-create and task-update

## Notes

## Learnings

- LRN-070: flowstate CLI flags live in two tables: COMMAND_HELP and COMMAND_FLAGS
## Progress Log

- [2026-11-10] Created
- [2026-11-19] Started
- [2026-11-19] criterion 1 — evidence: COMMAND_FLAGS allowlist for all 27 commands (+ --json) checked in main(); pnpm vitest run src/bin/flowstate.integration.test.ts -t 'unknown flags' → 6 passed, exit 1 with 'Unknown flag for <cmd>: --x. Accepted flags: …' (2026-11-19)
- [2026-11-19] criterion 2 — evidence: RPT-030 repros now fail: 'task-create --tag cli --depends TSK-001' and 'task-update TSK-001 --tick 1' → exit 1, no file written/changed (integration tests) (2026-11-19)
- [2026-11-19] criterion 3 — evidence: script over rg of every 'flowstate.js <cmd> --flag' and '<cmd> ... --flag' in plugins/*/skills, shared, SKILL.md, agents, hooks, references, docs, scripts → 0 rejected; rg continuation lines (add-task) and scripts/sandbox-github-backend.mjs arg arrays → all accepted; COMMAND_HELP vs COMMAND_FLAGS parity → no diff (2026-11-19)
- [2026-11-19] criterion 4 — evidence: tests 'task-create --tag exits 1…', 'task-update --tick exits 1…' (flowstate.integration.test.ts) and rejectUnknownFlags unit tests (args.test.ts); failed before fix (9 failing), pass after; flowstate vitest → 502 passed (2026-11-19)
- [2026-11-19] Completed