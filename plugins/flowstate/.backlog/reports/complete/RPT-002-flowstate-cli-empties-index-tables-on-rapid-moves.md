---
id: RPT-002
title: Flowstate CLI empties index tables on rapid moves
type: bug
severity: medium
status: triaged
created: 2026-04-10
triaged: 2026-04-09
task-id: TSK-007
---

When completing multiple tasks in rapid succession — e.g. using `/flowstate:complete-task` on one task and immediately running it again on another — the CLI empties the phase tables in `tasks/index.md`. Task files on disk remain correct, but the index loses all its rows. Commands that depend on the index (e.g. `/flowstate:status`) then show zero counts across all phases.

Observed in hustle-monorepo while completing several tasks in a batch session.

## Impact

- `/flowstate:status` shows wrong stats (pending/active/complete all read 0)
- `/flowstate:next-task` and similar commands may behave incorrectly
- Index must be regenerated manually from the task files in each phase directory

## Steps to Reproduce

1. Have several active and pending tasks
2. Complete two or more tasks back-to-back without pausing between CLI invocations
3. Run `/flowstate:status` — phase counts are 0 even though task files exist

## Workaround

Verify `tasks/index.md` after any batch operation. If phase tables are empty, regenerate the rows manually by reading the files in `tasks/pending/`, `tasks/active/`, and `tasks/complete/`.
