---
id: TSK-065
title: Fix: list commands accept a negative or non-numeric --limit
status: complete
priority: P4
tags: [flowstate, cli]
created: 2026-10-26
source: report/RPT-017
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: list commands accept a negative or non-numeric --limit

## Description

From RPT-017. `plugins/flowstate/src/bin/flowstate.ts:366`, `:538`, `:588`, `:631` parse `--limit` with `parseInt` and no check; `task-list.ts:51`, `idea-list.ts:46`, `report-list.ts:48` then `slice(0, limit)`. `--limit -1` silently drops the last row; `0` and `abc` return everything.

## Acceptance Criteria

- [x] --limit on task-list, idea-list, report-list and learning-search accepts only a positive integer; anything else exits 1 with an actionable error — evidence: parseLimit rejects -1, 0, abc with exit 1 on task-list, idea-list, report-list, learning-search (2026-11-07)
- [x] Regression tests cover -1, 0 and abc; pnpm test passes — evidence: integration it.each over four commands; flowstate 397 tests pass (2026-11-07)

## Notes

## Learnings

## Progress Log

- [2026-10-26] Created
- [2026-11-07] Started
- [2026-11-07] Completed