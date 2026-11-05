---
id: RPT-016
title: task-update --set writes unvalidated values, including id and priority
type: bug
severity: medium
status: triaged
created: 2026-10-26
triaged: 2026-10-26
task-id: TSK-064
---

## Observed

`task-update --set key=value` only rejects `status` and `blocked-by`. Every other key is written as-is. `--set id=TSK-003` on TSK-002 gives two tasks with ID TSK-003. `--set priority=P9` is accepted, while `task-create --priority P9` is rejected.

## Location

- `plugins/flowstate/src/commands/task-update.ts:46` — `REJECTED_KEYS = ["status", "blocked-by"]`
- `plugins/flowstate/src/commands/task-update.ts:65-66` — `for (const [key, value] of Object.entries(updates)) { fm[key] = value; }` with no per-key validation
- `plugins/flowstate/src/bin/flowstate.ts:351` — `task-create` runs `validatePriority`, so the two commands disagree at the same boundary

## Reproduction

In a scratch repo with TSK-001..TSK-003:

```
$ flowstate task-update TSK-001 --set priority=P9     # exit 0
$ flowstate task-create --title z --priority P9       # exit 1
Error: Invalid priority: "P9". Expected: P1, P2, P3, P4

$ flowstate task-update TSK-002 --set id=TSK-003      # exit 0
$ flowstate task-list
TSK-003	t2	pending	P3		2026-10-26	.../tasks/pending/TSK-002-t2.md
TSK-003	t3	pending	P3		2026-10-26	.../tasks/pending/TSK-003-t3.md
TSK-001	t1	pending	P9		2026-10-26	.../tasks/pending/TSK-001-t1.md
```

The duplicate ID breaks lookup by ID and the index. Other CLI-owned keys (`created`, `source`) can be rewritten the same way.
