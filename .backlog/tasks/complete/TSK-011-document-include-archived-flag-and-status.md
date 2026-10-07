---
id: TSK-011
title: Document --include-archived flag and status filters in flowstate CLI README
status: complete
priority: P3
tags: [flowstate, docs, learnings]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
condensed: true
---

# Document --include-archived flag and status filters in flowstate CLI README

## Description

learning-search/learning-list behavior with archived entries unclear. Verify implementation, document default filter and how to surface archived/superseded.

## Acceptance Criteria

- [x] README documents archived filter default for learning-list and learning-search
- [x] --include-archived flag documented with example
- [ ] Status filter behavior consistent across both commands
- [x] Add example: list including archived

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Completed
- [2026-04-29] Condensed
- [2026-10-07] Backlog review 2026-10-07: criteria checked against the code. 4 met after adding a learning-list --include-archived example to the README. 3 not met by design: learning-search stays active-only, documented in the README CLI reference.
