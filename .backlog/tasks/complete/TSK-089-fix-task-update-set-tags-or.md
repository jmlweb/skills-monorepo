---
id: TSK-089
title: Fix: task-update --set tags= or depends-on= writes a scalar that every reader drops
status: complete
priority: P3
tags: [flowstate, cli, validation]
created: 2026-11-16
source: report/RPT-034
depends-on: []
started: 2026-11-25
completed: 2026-11-25
---

# Fix: task-update --set tags= or depends-on= writes a scalar that every reader drops

## Description

`task-update --set` copies every value as a raw string (`src/commands/task-update.ts:73-75`). For the list fields `tags` and `depends-on` this writes a scalar that `index-rebuild` and `task-list` read back as empty, so tags are silently lost with exit 0. See RPT-034 for the reproduction.

## Acceptance Criteria

- [x] task-update --set tags=x,y stores tags as a YAML list (or exits 1 naming the list field), and task-list --json returns the tags
- [x] task-update --set depends-on=... gets the same list handling
- [x] A colocated vitest case reproduces the scalar write and passes after the fix
- [x] dist/ rebuilt and committed

## Notes

## Learnings

- LRN-072: Root pnpm build/test fail with turbo 'Exec format error' on the hustle box; run per-plugin scripts
## Progress Log

- [2026-11-16] Created
- [2026-11-25] Started
- [2026-11-25] criterion 1 — evidence: built CLI in scratch repo: task-update TSK-001 --set tags=x,y → exit 0, file has 'tags: [x, y]', task-list --json returns ["x","y"] (2026-11-25)
- [2026-11-25] criterion 2 — evidence: --set depends-on=TSK-002 → 'depends-on: [TSK-002]'; vitest case 'stores --set depends-on=TSK-002,TSK-003 as a YAML list' passes (2026-11-25)
- [2026-11-25] criterion 3 — evidence: pnpm vitest run src/commands/task-update.test.ts → 3 new RPT-034 cases failed before fix, 19/19 pass after (2026-11-25)
- [2026-11-25] criterion 4 — evidence: pnpm run build in plugins/flowstate → dist/commands/task-update.js and dist/bin/flowstate.js regenerated and committed (2026-11-25)
- [2026-11-25] Completed