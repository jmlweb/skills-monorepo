---
id: RPT-026
title: task-doctor plain output prints [object Object] for each fixed task
type: bug
severity: low
status: triaged
created: 2026-11-05
triaged: 2026-11-05
task-id: TSK-074
---

## Location

`plugins/flowstate/src/bin/flowstate.ts:755-758`: for a non-array result, `output()` prints `${key}: ${value}`. `task-doctor` (`flowstate.ts:493-497`) returns `{ scanned, fixed: TaskDoctorFix[] }`, so each fix object is stringified as `[object Object]`.

`plugins/flowstate/SKILL.md:55` documents `flowstate task-doctor` without `--json`, which is exactly the broken path.

## Reproduction

In a temp backlog with two tasks whose status disagrees with their folder (for example, block two pending tasks with `task-block`), run `node plugins/flowstate/dist/bin/flowstate.js task-doctor`.

## Observed

```
scanned: 4
fixed: [object Object],[object Object]
```

## Expected

One tab-separated row per fix (id, folder, statusBefore, statusAfter), matching the CLI's plain-output convention, so a user can see which tasks were changed.
