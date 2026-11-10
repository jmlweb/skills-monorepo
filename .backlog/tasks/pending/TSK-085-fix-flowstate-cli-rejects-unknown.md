---
id: TSK-085
title: Fix: flowstate CLI rejects unknown flags that carry a value
status: pending
priority: P3
tags: [cli, args, flowstate]
created: 2026-11-10
source: report/RPT-030
depends-on: []
---

# Fix: flowstate CLI rejects unknown flags that carry a value

## Description

parseArgs (plugins/flowstate/src/core/args.ts:13-37) keeps any --key value pair, so misspelt flags are dropped silently with exit 0. Add per-command allowlists. See RPT-030 for reproductions.

## Acceptance Criteria

- [ ] Each flowstate command validates flags against its accepted set and fails with exit 1 naming the unknown flag
- [ ] task-create --tag x and task-update --tick 1 fail instead of exiting 0
- [ ] Every flag used by flowstate skills is still accepted (grep skills for flags)
- [ ] Tests cover an unknown valued flag on at least task-create and task-update

## Notes

## Learnings

## Progress Log

- [2026-11-10] Created