---
id: TSK-061
title: Fix: task-create --criteria accepts non-string-array JSON and crashes or writes object Object
status: pending
priority: P4
tags: [flowstate, cli]
created: 2026-10-22
source: report/RPT-013
depends-on: []
---

# Fix: task-create --criteria accepts non-string-array JSON and crashes or writes object Object

## Description

### Context

From RPT-013. `plugins/flowstate/src/bin/flowstate.ts:345` does `JSON.parse(flags["criteria"]) as string[]` with no check. `'"one"'` crashes with `input.criteria.map is not a function`; `[1,{"a":2}]` writes a `[object Object]` criterion.

### Approach

Add a `parseCriteria` validator next to `validatePriority` in the entry point. Throw `InvalidArgumentError` unless the value parses to an array of non-empty strings.

## Acceptance Criteria

- [ ] --criteria that is not a JSON array of non-empty strings exits 1 with an InvalidArgumentError showing the expected format
- [ ] Invalid JSON in --criteria gets the same actionable message instead of the raw parser error
- [ ] Tests cover a JSON string, an array with non-string items and invalid JSON
- [ ] dist rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-22] Created