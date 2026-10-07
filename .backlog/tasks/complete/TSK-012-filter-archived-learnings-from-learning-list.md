---
id: TSK-012
title: Filter archived learnings from learning-list by default
status: complete
priority: P2
tags: [flowstate, learnings, cli]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
condensed: true
---

# Filter archived learnings from learning-list by default

## Description

learning-list outputs archived entries (e.g. LRN-032) in general listing. Default should be active-only, opt-in archived via --include-archived. Aligns with learning-search behavior.

## Acceptance Criteria

- [x] learning-list shows only active by default
- [x] --include-archived flag includes archived/superseded
- [x] --status flag accepts active|archived|superseded|all
- [x] Existing tests updated; new test covers default filter

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Completed
- [2026-04-29] Condensed
- [2026-10-07] Backlog review 2026-10-07: criteria checked against the code. All met.
