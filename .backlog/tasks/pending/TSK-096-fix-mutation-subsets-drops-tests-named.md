---
id: TSK-096
title: Fix: mutation-subsets drops tests named only in killedBy/coveredBy and exits 0 as clean
status: pending
priority: P4
tags: [code-hygiene, mutation-subsets]
created: 2026-11-25
source: report/RPT-041
depends-on: []
---

# Fix: mutation-subsets drops tests named only in killedBy/coveredBy and exits 0 as clean

## Description

`plugins/code-hygiene/src/commands/mutation-subsets.ts:56` takes its test ids from `testFiles` only. When `testFiles` is missing or partial, tests are silently left out and the command exits 0 with no subsets. See RPT-041. Build the id set from `testFiles` plus every `killedBy`/`coveredBy` id.

## Acceptance Criteria

- [ ] Test ids present only in killedBy/coveredBy are compared, labelled by id when testFiles lacks them
- [ ] A report with no testFiles but killedBy data yields the expected subsumed test
- [ ] Tests cover a missing and a partial testFiles section

## Notes

## Learnings

## Progress Log

- [2026-11-25] Created