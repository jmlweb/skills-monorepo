---
id: RPT-039
title: backlog:check rejects a blocked task in tasks/pending, which task-block writes by design
type: bug
severity: medium
status: triaged
created: 2026-11-22
triaged: 2026-11-22
task-id: TSK-093
---

## Location
`scripts/check-backlog-integrity.mjs:21-25`: `FOLDER_STATUSES["tasks/pending"]` allows only `"pending"`, and the comment says blocked tasks live under `tasks/active`. Since TSK-073 (RPT-025) the CLI's model is the opposite: `task-block` keeps a pending task in `tasks/pending/` with `status: blocked` (`plugins/flowstate/src/commands/task-block.ts:11-19`), and `taskStatusOf` (`plugins/flowstate/src/core/store.ts:31`) and `task-doctor` treat that as correct. The CI step "Check backlog index and status/folder consistency" (`.github/workflows/ci.yml`, `pnpm backlog:check`) therefore fails on a state the CLI produces and blesses.

## Reproduction
Binary: repo HEAD at aa6a2c8.
```bash
D="$(mktemp -d)"; cd "$D"; export FLOWSTATE_SHARED=off
F=<repo>/plugins/flowstate/dist/bin/flowstate.js
node $F setup
node $F task-create --title A --priority P2
node $F task-block TSK-001 --reason dep
node $F task-doctor --json true
node --input-type=module -e "import {collectStatusMismatches} from '<repo>/scripts/check-backlog-integrity.mjs'; console.log(collectStatusMismatches('$D/.backlog'))"
```

## Observed
- `task-doctor`: `{"scanned":1,"fixed":[]}`, so the CLI considers the file consistent.
- Integrity check: `.backlog/tasks/pending/TSK-001-a.md: status "blocked" does not belong in tasks/pending/ (expected pending)`

Blocking any pending task in this repo's dogfooded backlog would turn CI red on the next PR.

## Expected
`tasks/pending` accepts `pending` and `blocked` (matching `taskStatusOf`), the stale comment is corrected, and `scripts/check-backlog-integrity.test.mjs` covers a blocked pending task.
