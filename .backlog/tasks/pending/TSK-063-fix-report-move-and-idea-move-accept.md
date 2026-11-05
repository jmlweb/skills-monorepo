---
id: TSK-063
title: Fix: report-move and idea-move accept any --status value
status: pending
priority: P3
tags: []
created: 2026-10-26
source: report/RPT-015
depends-on: []
---

# Fix: report-move and idea-move accept any --status value

## Description

From RPT-015. `plugins/flowstate/src/bin/flowstate.ts:556` and `:606` cast `--status` without checking it, so `report-move RPT-001 --status bogus` exits 0, writes `status: bogus` and moves the report to complete, where it can no longer be triaged. Validate the value like `task-move --to` does.

Distinct from TSK-062 (empty or `--`-prefixed values).

## Acceptance Criteria

- [ ] report-move --status outside triaged/discarded exits 1 with an actionable error and leaves the report in reports/pending
- [ ] idea-move --status outside approved/discarded exits 1 with an actionable error and leaves the idea in ideas/pending
- [ ] Regression tests cover an invalid status for both commands; pnpm test passes

## Notes

## Learnings

## Progress Log

- [2026-10-26] Created