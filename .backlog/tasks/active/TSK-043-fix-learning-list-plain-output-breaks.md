---
id: TSK-043
title: Fix: learning-list plain output breaks one-row-per-entity format with multiline body
status: active
priority: P3
tags: [flowstate, cli, learnings, output]
created: 2026-10-08
source: report/RPT-007
depends-on: []
started: 2026-10-08
---

# Fix: learning-list plain output breaks one-row-per-entity format with multiline body

## Description

`flowstate learning-list` in plain mode prints each learning's full body as the last tab-separated column. Bodies contain newlines, so 7 learnings produce 57 lines, breaking the one-row-per-entity convention.

### Cause
`src/commands/learning-list.ts` returns `body: doc.body.trim()`; the generic `output()` helper in `src/bin/flowstate.ts` (~line 626) joins fields with `\t` without escaping or dropping multiline values.

### Impact
Line-oriented consumers (`cut`, `grep`, `wc -l`, skills parsing rows) misread body fragments as entries. In-repo skills use `--json true` today, so nothing breaks yet; the learnings skill suggests plain `learning-list --status archived`.


## Acceptance Criteria

- [ ] learning-list plain mode prints exactly one line per learning (7 learnings -> 7 lines)
- [ ] Fix applied in the shared output() helper or by omitting body from plain rows; --json true output unchanged and still includes body
- [ ] Integration test asserts every list command (task-list, idea-list, learning-list, learning-search) prints one line per entity in plain mode
- [ ] learnings skill guidance still accurate for plain learning-list usage
- [ ] pnpm typecheck and pnpm test pass; dist rebuilt

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started