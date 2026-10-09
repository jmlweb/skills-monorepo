---
id: TSK-044
title: Guard release tags: tag must match package.json and sit on main
status: complete
priority: P2
tags: [ci, release, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
started: 2026-10-08
completed: 2026-10-08
---

# Guard release tags: tag must match package.json and sit on main

## Description

From AGENTS.md mistake 10. Add a pre-push step or CI check failing when a pushed plugins/<name>/v<X> tag does not match package.json, and make release.yml require the tag commit to be on main. Today only the version mismatch is caught, after the release has started.

## Acceptance Criteria

- [ ] Mismatched tag is rejected before the release starts
- [ ] release.yml fails when the tag commit is not on main
- [ ] Test or workflow dry-run documents the behavior

## Notes

## Learnings

- LRN-013: Worktree agents cannot run git through the rtk hook
- LRN-015: Test not-on-main by checking out the tagged commit
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started
- [2026-10-08] Completed