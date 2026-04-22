---
id: TSK-008
title: Fix: CLI silently returns empty results when cwd is not the backlog root
status: complete
priority: P2
tags: []
created: 2026-04-10
source: report/RPT-003
depends-on: []
started: 2026-04-10
completed: 2026-04-10
---

# Fix: CLI silently returns empty results when cwd is not the backlog root

## Description

All CLI commands use process.cwd() to resolve .backlog/. When the shell cwd is a subdirectory (e.g. after pnpm --filter changes directory), commands silently return empty results or fail with cryptic errors.

Root cause: src/bin/flowstate.ts:21 sets cwd = process.cwd(), and src/core/fs.ts listFiles() catches missing-directory errors and returns [] silently.

Fix approach:
1. Implement findBacklogRoot() that walks parent directories (like git finds .git/)
2. Fail loudly if .backlog/ is not found in any ancestor
3. Add integration test running CLI from a subdirectory

See RPT-003 and LRN-001 for full analysis.


## Acceptance Criteria

- [x] Running any command from a subdirectory of a project with .backlog/ at root resolves correctly
- [x] Running from outside any project with .backlog/ exits with a clear error message
- [x] Integration test covers the subdirectory scenario
- [x] listFiles() propagates or surfaces errors when the target directory does not exist

## Notes

## Learnings

## Progress Log

- [2026-04-10] Created
- [2026-04-10] Started
- [2026-04-10] Completed