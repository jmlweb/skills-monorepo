---
id: TSK-065
title: Fix: list commands accept a negative or non-numeric --limit
status: pending
priority: P4
tags: []
created: 2026-10-26
source: report/RPT-017
depends-on: []
---

# Fix: list commands accept a negative or non-numeric --limit

## Description

From RPT-017. `plugins/flowstate/src/bin/flowstate.ts:366`, `:538`, `:588`, `:631` parse `--limit` with `parseInt` and no check; `task-list.ts:51`, `idea-list.ts:46`, `report-list.ts:48` then `slice(0, limit)`. `--limit -1` silently drops the last row; `0` and `abc` return everything.

## Acceptance Criteria

- [ ] --limit on task-list, idea-list, report-list and learning-search accepts only a positive integer; anything else exits 1 with an actionable error
- [ ] Regression tests cover -1, 0 and abc; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-10-26] Created