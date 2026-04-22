---
id: TSK-007
title: Fix: Flowstate CLI empties index tables on rapid moves
status: complete
priority: P3
tags: []
created: 2026-04-09
source: report/RPT-002
depends-on: []
started: 2026-04-09
completed: 2026-04-09
---

# Fix: Flowstate CLI empties index tables on rapid moves

## Description

## Problem

When completing multiple tasks in rapid succession, the CLI empties the phase tables in `tasks/index.md`. Task files on disk remain correct, but the index loses all its rows. Commands that depend on the index (e.g. `/flowstate:status`) then show zero counts across all phases.

Observed in hustle-monorepo while completing several tasks in a batch session.

## Impact

- `/flowstate:status` shows wrong stats (pending/active/complete all read 0)
- `/flowstate:next-task` and similar commands may behave incorrectly
- Index must be regenerated manually from the task files in each phase directory

## Steps to Reproduce

1. Have several active and pending tasks
2. Complete two or more tasks back-to-back without pausing between CLI invocations
3. Run `/flowstate:status` — phase counts are 0 even though task files exist

## Root Cause (suspected)

Race condition or overwrite issue in the index update logic — likely a concurrent write or stale read where a second invocation overwrites the index with a snapshot that predates the first invocation's changes.

## Source

RPT-002


## Acceptance Criteria

- [ ] Completing multiple tasks back-to-back no longer empties phase tables in tasks/index.md
- [ ] Index counts in /flowstate:status match actual task files after batch completions
- [ ] No manual index regeneration required after rapid CLI invocations

## Notes

## Learnings

## Progress Log

- [2026-04-09] Created
- [2026-04-09] Started
- [2026-04-09] Completed