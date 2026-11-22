---
id: TSK-093
title: Fix: backlog:check rejects a blocked task in tasks/pending, which task-block writes by design
status: pending
priority: P3
tags: []
created: 2026-11-22
source: report/RPT-039
depends-on: []
---

# Fix: backlog:check rejects a blocked task in tasks/pending, which task-block writes by design

## Description

See RPT-039. Since TSK-073 the CLI keeps a blocked pending task in `tasks/pending/` with `status: blocked`, but `scripts/check-backlog-integrity.mjs:24` only allows `pending` there, so the CI gate fails on a CLI-blessed state.

## Acceptance Criteria

- [ ] FOLDER_STATUSES in scripts/check-backlog-integrity.mjs allows blocked in tasks/pending, matching taskStatusOf
- [ ] The stale comment claiming blocked tasks live only under tasks/active is corrected
- [ ] scripts/check-backlog-integrity.test.mjs covers a blocked task in tasks/pending passing the status check

## Notes

## Learnings

## Progress Log

- [2026-11-22] Created