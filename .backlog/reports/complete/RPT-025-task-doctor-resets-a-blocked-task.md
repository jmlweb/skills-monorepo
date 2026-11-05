---
id: RPT-025
title: task-doctor resets a blocked task in tasks/pending to pending and the block disappears
type: bug
severity: medium
status: triaged
created: 2026-11-05
triaged: 2026-11-05
task-id: TSK-073
---

## Location

`plugins/flowstate/src/commands/task-doctor.ts:80-81`: `isBlocked = folder === "active" && Boolean(blockedBy)`, so a task in `tasks/pending/` is never considered blocked and its canonical status is forced to `pending`.

`task-block` (`plugins/flowstate/src/commands/task-block.ts:11`) accepts pending tasks and writes `status: blocked` without moving the file (documented in LRN-040). The two commands disagree.

Related read paths also ignore it: `task-list.ts:26` maps `--status blocked` to the `active` folder only, and `stats.ts:35` / `index-rebuild.ts:64` count blocked only in `active`.

## Reproduction

```bash
cd "$(mktemp -d)"
F=<repo>/plugins/flowstate/dist/bin/flowstate.js
node $F setup
node $F task-create --title y --priority P3
node $F task-block TSK-001 --reason "dep"
node $F task-list --status blocked   # prints nothing
node $F stats                        # blocked: 0
node $F task-doctor --json true
```

## Observed

`task-doctor` output:

```json
{"id": "TSK-001", "folder": "pending", "statusBefore": "blocked", "statusAfter": "pending"}
```

The file now says `status: pending` while `blocked-by: dep` stays. Before that, the block was already invisible to `task-list --status blocked`, `stats` and `tasks/index.md`.

## Expected

A task blocked from pending is reported as blocked and `task-doctor` keeps its status. Either `task-block` moves the task to `active/` (where every reader looks), or doctor, list, stats and index treat `pending` + `blocked-by` as blocked.
