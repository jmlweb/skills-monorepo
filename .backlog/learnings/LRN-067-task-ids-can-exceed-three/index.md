---
id: LRN-067
title: Task IDs can exceed three digits in GitHub mode; validate with TSK-\d{3,}, not parseId
status: active
tags: [flowstate, cli, validation, github]
task: TSK-083
created: 2026-11-13
---

`parseId` in `src/core/id.ts` matches `^[A-Z]{3}-\d{3}$`, but in GitHub mode the ID is the issue number: `formatId` pads to three digits without capping, so issue 1234 becomes `TSK-1234`, and `issueNumberOf` in `github-store.ts` accepts `\d+`. A validator that reuses `parseId` would reject real GitHub-mode IDs past 999.

For flag validation (e.g. `--task-id` on report-move/idea-move), use `^TSK-\d{3,}$` (`validateTaskId` in `core/types.ts`).
