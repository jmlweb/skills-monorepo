---
id: TSK-082
title: Fix: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root
status: pending
priority: P2
tags: [dev-workflow, hooks, read-only-zones]
created: 2026-11-08
source: report/RPT-027
depends-on: []
---

# Fix: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root

## Description

Source: RPT-027. `checkTarget` uses the nearest `.git` entry above the target as the match root (`plugins/dev-workflow/src/core/read-only-zones.ts:195`, `:183`), so a submodule or nested repo under the project becomes its own root. Result: zones that name the nested directory are bypassed (exit 0) and root-level zones hit the nested repo's paths. README promises globs relative to the repository root (`plugins/dev-workflow/README.md:402`). Reproduction in RPT-027.

## Acceptance Criteria

- [ ] A file inside a nested git repo or submodule under the project is matched relative to the project repository root, so a zone covering the nested directory blocks it
- [ ] A root-level zone such as dist/** no longer blocks the nested repo own dist/ directory
- [ ] Linked worktrees outside the project and sessions started in a subdirectory keep their current behaviour (existing tests pass)
- [ ] read-only-zones.test.ts covers a nested repo with a .git directory and a submodule-style .git file pointing into .git/modules/
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-08] Created