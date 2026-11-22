---
id: RPT-038
title: task-move --to pending writes status pending on a blocked task that keeps blocked-by
type: bug
severity: low
status: triaged
created: 2026-11-22
triaged: 2026-11-22
task-id: TSK-094
---

## Location
`plugins/flowstate/src/commands/task-move.ts:22`: `fm["status"] = to === "active" && fm["blocked-by"] ? "blocked" : to;` keeps the blocked status only for `--to active`. TSK-073 settled the model "pending + blocked-by is blocked" in `taskStatusOf` (`plugins/flowstate/src/core/store.ts:31`), but `task-move` does not use it, so it writes a status its own readers disagree with. Residual gap of RPT-025/TSK-073.

## Reproduction
Binary: repo HEAD `plugins/flowstate/dist/bin/flowstate.js` at aa6a2c8.
```bash
cd "$(mktemp -d)"; export FLOWSTATE_SHARED=off
F=<repo>/plugins/flowstate/dist/bin/flowstate.js
node $F setup
node $F task-create --title A --priority P2
node $F task-move TSK-001 --to active
node $F task-block TSK-001 --reason x
node $F task-move TSK-001 --to pending
grep -E '^(status|blocked-by)' .backlog/tasks/pending/TSK-001-a.md
node $F task-list --status blocked
node $F task-doctor --json true
```

## Observed
- File: `status: pending` with `blocked-by: x` still present.
- `task-list --status blocked` lists TSK-001 as `blocked` (derived), contradicting the frontmatter.
- `task-doctor` immediately "fixes" it: `{"id":"TSK-001","folder":"pending","statusBefore":"pending","statusAfter":"blocked"}`.

## Expected
`task-move` derives the written status through `taskStatusOf(to, fm)`, so a move never produces drift that `task-doctor` has to repair.
