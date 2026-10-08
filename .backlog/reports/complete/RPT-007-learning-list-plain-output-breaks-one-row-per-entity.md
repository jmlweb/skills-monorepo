---
id: RPT-007
title: learning-list plain output breaks one-row-per-entity format with multiline body
type: bug
severity: medium
status: triaged
created: 2026-10-08
triaged: 2026-10-08
task-id: TSK-043
---

## Summary

`flowstate learning-list` (plain mode) prints each learning's full body as the last tab-separated column. Bodies contain newlines, so one learning spans many lines: 7 learnings produce 57 lines. This breaks the house convention that plain output is one tab-separated row per entity.

## Repro

```bash
node plugins/flowstate/dist/bin/flowstate.js learning-list | wc -l   # 57 for 7 learnings
node plugins/flowstate/dist/bin/flowstate.js learning-list | cut -f1,3   # body fragments appear as extra "rows"
```

## Cause

`src/commands/learning-list.ts` returns `body: doc.body.trim()` per entry. The generic `output()` helper in `src/bin/flowstate.ts` (~line 626) joins every field with `\t` and does not escape or drop multiline values.

## Impact

- Line-oriented consumers (`cut`, `grep`, `wc -l`, a skill parsing rows) misread fragments of the body as extra entries.
- In-repo skills use `learning-list --json true` (condense-learnings) so none break today; `learnings` skill suggests plain `learning-list --status archived` to users and agents.

## Possible fixes

- Omit `body` from plain-mode rows (keep it in `--json true`), or
- Have `output()` collapse newlines in string fields for plain mode, with a test asserting one line per entity for every list command.
