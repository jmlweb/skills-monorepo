---
id: RPT-013
title: task-create --criteria accepts non-string-array JSON and crashes or writes object Object
type: bug
severity: low
status: triaged
created: 2026-10-22
triaged: 2026-10-22
task-id: TSK-061
---

## Description

`plugins/flowstate/src/bin/flowstate.ts:345` parses `--criteria` with `JSON.parse(flags["criteria"]) as string[]`. The cast is unchecked: any valid JSON passes through to `taskCreate`.

## Reproduction

In a temp backlog (built CLI from `plugins/flowstate/dist`):

- `task-create --title c2 --priority P3 --criteria '"one"'` prints `Error: input.criteria.map is not a function` (raw TypeError, no task created, no hint about the expected format).
- `task-create --title c3 --priority P3 --criteria '[1,{"a":2}]'` exits 0 and writes these criteria:
  `- [ ] 1`
  `- [ ] [object Object]`

For comparison, invalid JSON (`--criteria 'one, two'`) fails with the raw parser message `Unexpected token 'o', "one, two" is not valid JSON`, which also gives no format hint.

## Expected

The entry point validates that `--criteria` is a JSON array of non-empty strings and otherwise exits 1 with an `InvalidArgumentError` naming the format, e.g. `--criteria '["first", "second"]'`.
