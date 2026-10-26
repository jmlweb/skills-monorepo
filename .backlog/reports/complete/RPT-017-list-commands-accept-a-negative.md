---
id: RPT-017
title: List commands accept a negative or non-numeric --limit and return wrong rows
type: bug
severity: low
status: triaged
created: 2026-10-26
triaged: 2026-10-26
task-id: TSK-065
---

## Observed

`--limit` is parsed with `parseInt` and never validated. A negative value drops rows from the end. `0` and non-numeric values return everything. All exit 0.

## Location

- `plugins/flowstate/src/bin/flowstate.ts:366`, `:538`, `:588`, `:631` — `flags["limit"] ? parseInt(flags["limit"], 10) : undefined`
- `plugins/flowstate/src/commands/task-list.ts:51`, `idea-list.ts:46`, `report-list.ts:48` — `limit ? items.slice(0, limit) : items` (`NaN` and `0` are falsy; `-1` slices off the last row)

## Reproduction

Scratch repo with 3 pending tasks:

```
$ flowstate task-list --limit -1    # 2 rows (TSK-001, TSK-002); TSK-003 silently dropped
$ flowstate task-list --limit 0     # 3 rows
$ flowstate task-list --limit abc   # 3 rows
```

Expected: a positive integer, or exit 1 with an actionable error.
