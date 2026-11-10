---
id: TSK-082
title: Fix: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root
status: complete
priority: P2
tags: [dev-workflow, hooks, read-only-zones]
created: 2026-11-08
source: report/RPT-027
depends-on: []
started: 2026-11-10
completed: 2026-11-10
---

# Fix: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root

## Description

Source: RPT-027. `checkTarget` uses the nearest `.git` entry above the target as the match root (`plugins/dev-workflow/src/core/read-only-zones.ts:195`, `:183`), so a submodule or nested repo under the project becomes its own root. Result: zones that name the nested directory are bypassed (exit 0) and root-level zones hit the nested repo's paths. README promises globs relative to the repository root (`plugins/dev-workflow/README.md:402`). Reproduction in RPT-027.

## Acceptance Criteria

- [x] A file inside a nested git repo or submodule under the project is matched relative to the project repository root, so a zone covering the nested directory blocks it
- [x] A root-level zone such as dist/** no longer blocks the nested repo own dist/ directory
- [x] Linked worktrees outside the project and sessions started in a subdirectory keep their current behaviour (existing tests pass)
- [x] read-only-zones.test.ts covers a nested repo with a .git directory and a submodule-style .git file pointing into .git/modules/
- [x] dist/ rebuilt and committed

## Notes

## Learnings

- LRN-066: A submodule .git file also points inside the parent .git: check .git/worktrees/, not .git/
## Progress Log

- [2026-11-08] Created
- [2026-11-10] Started
- [2026-11-10] criterion 1 — evidence: pnpm vitest run src/core/read-only-zones.test.ts (nested .git dir + submodule .git file: vendor/lib/x.js and vendor/lib/dist/a.js blocked by vendor/lib/**) and RPT-027 repro on rebuilt dist → both exit 2 as vendor/lib/... (2026-11-10)
- [2026-11-10] criterion 2 — evidence: test 'keeps a root-level zone off the nested repo's own directories' → vendor/lib/dist/a.js no-match under dist/**, dist/a.js still blocked (2026-11-10)
- [2026-11-10] criterion 3 — evidence: pnpm test → dev-workflow 233 passed / 1 skipped, existing linked-worktree and session-subdirectory tests unchanged and green (2026-11-10)
- [2026-11-10] criterion 4 — evidence: describe.each in read-only-zones.test.ts runs 3 cases for a nested .git directory and a submodule .git file 'gitdir: ../../.git/modules/vendor/lib'; 6 failed before the fix, pass after (2026-11-10)
- [2026-11-10] criterion 5 — evidence: pnpm build → plugins/dev-workflow/dist/core/read-only-zones.js regenerated and staged with src (2026-11-10)
- [2026-11-10] Completed