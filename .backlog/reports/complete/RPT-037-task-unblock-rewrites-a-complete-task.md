---
id: RPT-037
title: task-unblock rewrites a complete task to status active inside tasks/complete
type: bug
severity: medium
status: triaged
created: 2026-11-22
triaged: 2026-11-22
task-id: TSK-092
---

## Location
- `plugins/flowstate/src/commands/task-unblock.ts:12`: the task is looked up in `BUCKETS.task`, which includes `complete`. `task-block.ts:11` only accepts `["pending", "active"]`, and `core/store.ts:23` already exports `BLOCKABLE_BUCKETS` for exactly that set.
- `plugins/flowstate/src/commands/task-unblock.ts:23`: the status is restored to `active`/`pending` from `started` without checking that the task carries `blocked-by` at all, and without regard to its folder.

## Reproduction
Binary: repo HEAD `plugins/flowstate/dist/bin/flowstate.js` at aa6a2c8.
```bash
cd "$(mktemp -d)"; export FLOWSTATE_SHARED=off
F=<repo>/plugins/flowstate/dist/bin/flowstate.js
node $F setup
node $F task-create --title A --priority P2
node $F task-move TSK-001 --to complete
node $F task-unblock TSK-001; echo "exit $?"
grep '^status' .backlog/tasks/complete/TSK-001-a.md
```

## Observed
- `task-unblock` exits 0 and prints `path: .../tasks/complete/TSK-001-a.md`.
- The file in `tasks/complete/` now has `status: active` and a bogus `- [date] Unblocked` log line after `Completed`.
- `task-doctor` reports drift: `TSK-001 ... complete active complete`.
- The repo's own CI gate (`scripts/check-backlog-integrity.mjs`, `collectStatusMismatches`) fails on it:
  `.backlog/tasks/complete/TSK-001-a.md: status "active" does not belong in tasks/complete/ (expected complete)`

Unblocking a pending or active task that was never blocked also exits 0 and appends an "Unblocked" log line; same missing guard.

## Expected
`task-unblock` only finds tasks in pending/active and rejects a task without `blocked-by` with an actionable error (non-zero exit), leaving the file untouched.
