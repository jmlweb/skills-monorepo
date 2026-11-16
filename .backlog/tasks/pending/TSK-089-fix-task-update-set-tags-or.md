---
id: TSK-089
title: Fix: task-update --set tags= or depends-on= writes a scalar that every reader drops
status: pending
priority: P3
tags: [flowstate, cli, validation]
created: 2026-11-16
source: report/RPT-034
depends-on: []
---

# Fix: task-update --set tags= or depends-on= writes a scalar that every reader drops

## Description

`task-update --set` copies every value as a raw string (`src/commands/task-update.ts:73-75`). For the list fields `tags` and `depends-on` this writes a scalar that `index-rebuild` and `task-list` read back as empty, so tags are silently lost with exit 0. See RPT-034 for the reproduction.

## Acceptance Criteria

- [ ] task-update --set tags=x,y stores tags as a YAML list (or exits 1 naming the list field), and task-list --json returns the tags
- [ ] task-update --set depends-on=... gets the same list handling
- [ ] A colocated vitest case reproduces the scalar write and passes after the fix
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-16] Created