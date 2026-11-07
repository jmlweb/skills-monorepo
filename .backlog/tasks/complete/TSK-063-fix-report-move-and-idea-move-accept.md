---
id: TSK-063
title: Fix: report-move and idea-move accept any --status value
status: complete
priority: P2
tags: [flowstate, cli]
created: 2026-10-26
source: report/RPT-015
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: report-move and idea-move accept any --status value

## Description

From RPT-015. `plugins/flowstate/src/bin/flowstate.ts:556` and `:606` cast `--status` without checking it, so `report-move RPT-001 --status bogus` exits 0, writes `status: bogus` and moves the report to complete, where it can no longer be triaged. Validate the value like `task-move --to` does.

Distinct from TSK-062 (empty or `--`-prefixed values).

## Acceptance Criteria

- [x] report-move --status outside triaged/discarded exits 1 with an actionable error and leaves the report in reports/pending
- [x] idea-move --status outside approved/discarded exits 1 with an actionable error and leaves the idea in ideas/pending
- [x] Regression tests cover an invalid status for both commands; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-10-26] Created
- [2026-11-07] Raised P3 to P2: silently corrupts backlog state, approved by the user 2026-11-07
- [2026-11-07] Started
- [2026-11-07] Merged worktree branch into main; flowstate 397 tests pass; dist clean.
- [2026-11-07] Completed