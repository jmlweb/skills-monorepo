---
id: TSK-090
title: Fix: task-update --set accepts malformed keys that bypass the status and priority guards
status: pending
priority: P3
tags: [flowstate, cli, validation]
created: 2026-11-19
source: report/RPT-035
depends-on: []
---

# Fix: task-update --set accepts malformed keys that bypass the status and priority guards

## Description

`task-update --set` uses the text before the first `=` as a frontmatter key with no validation (`src/bin/flowstate.ts:501-507`, `src/commands/task-update.ts:46-61`). A key containing `:` reads back as a different key, so `--set 'priority:P9=x'` stores `priority: P9: x` and `--set 'status:bogus=x'` sets status to `bogus: x`. Both bypass the guards. A pair without `=` is dropped silently with exit 0. See RPT-035 for the reproduction.

## Acceptance Criteria

- [ ] task-update --set exits 1 and leaves the file untouched for a pair without =
- [ ] task-update --set rejects keys that are not plain identifiers (empty, containing : or whitespace), so priority:P9=x and status:bogus=x no longer bypass the guards
- [ ] Colocated vitest cases reproduce each failure mode from RPT-035 and pass after the fix
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-19] Created