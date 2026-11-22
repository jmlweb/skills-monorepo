---
id: TSK-092
title: Fix: task-unblock rewrites a complete task to status active inside tasks/complete
status: pending
priority: P3
tags: []
created: 2026-11-22
source: report/RPT-037
depends-on: []
---

# Fix: task-unblock rewrites a complete task to status active inside tasks/complete

## Description

See RPT-037. `task-unblock.ts:12` searches `BUCKETS.task` (including complete) and `:23` restores a status without checking `blocked-by`. Unblocking a complete task writes `status: active` into `tasks/complete/`, which fails `pnpm backlog:check`. Restrict the lookup to `BLOCKABLE_BUCKETS` and reject tasks that are not blocked.

## Acceptance Criteria

- [ ] task-unblock looks up tasks only in pending and active (BLOCKABLE_BUCKETS); a complete task yields EntityNotFoundError and an unchanged file
- [ ] task-unblock on a task without blocked-by exits non-zero with an actionable error and appends no log line
- [ ] Tests cover both cases with real temp dirs and assert file contents

## Notes

## Learnings

## Progress Log

- [2026-11-22] Created