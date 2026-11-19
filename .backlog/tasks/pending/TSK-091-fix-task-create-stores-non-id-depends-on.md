---
id: TSK-091
title: Fix: task-create stores non-ID depends-on values and empty tags
status: pending
priority: P4
tags: [flowstate, cli, validation]
created: 2026-11-19
source: report/RPT-036
depends-on: []
---

# Fix: task-create stores non-ID depends-on values and empty tags

## Description

`task-create` splits `--depends-on` and `--tags` on commas without validation (`src/bin/flowstate.ts:436`, `:440-442`). A malformed dependency such as `garbage` is stored, and next-task keeps the task Blocked because that dependency never completes. `--tags 'a, ,b'` stores an empty tag. See RPT-036 for the reproduction.

## Acceptance Criteria

- [ ] task-create --depends-on exits 1 naming any entry that is not a task ID (TSK-\d{3,})
- [ ] task-create --tags drops or rejects empty entries, so a trailing comma never stores an empty tag
- [ ] Colocated vitest cases cover both inputs from RPT-036
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-19] Created