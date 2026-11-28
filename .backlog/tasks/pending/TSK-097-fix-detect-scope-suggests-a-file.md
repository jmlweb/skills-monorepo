---
id: TSK-097
title: Fix: detect-scope suggests a file name as scope for files directly under apps/, packages/ or plugins/
status: pending
priority: P3
tags: []
created: 2026-11-28
source: report/RPT-042
depends-on: []
---

# Fix: detect-scope suggests a file name as scope for files directly under apps/, packages/ or plugins/

## Description

`plugins/dev-workflow/src/commands/detect-scope.ts:54-55` treats `apps/README.md` as package `README.md`. Require `<workspace>/<package>/<file>` before deriving a scope. See RPT-042 for the reproduction.

## Acceptance Criteria

- [ ] detectScopeFromFiles ignores paths with fewer than 3 segments under apps/, packages/ and plugins/
- [ ] A staged apps/README.md alone falls back to the branch scope
- [ ] Unit test in detect-scope.test.ts covers a file directly under each workspace dir
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-28] Created