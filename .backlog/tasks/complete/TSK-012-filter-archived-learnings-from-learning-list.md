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
---

# Filter archived learnings from learning-list by default

## Description

learning-list outputs archived entries (e.g. LRN-032) in general listing. Default should be active-only, opt-in archived via --include-archived. Aligns with learning-search behavior.

## Acceptance Criteria

- [ ] learning-list shows only active by default
- [ ] --include-archived flag includes archived/superseded
- [ ] --status flag accepts active|archived|superseded|all
- [ ] Existing tests updated; new test covers default filter

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Started
- [2026-04-27] Default already filtered active-only (informe original incorrecto). Added --status <active|archived|superseded|all> filter and --include-archived alias for --status all. Existing --all flag preserved as alias. 4 new tests (3 unit + 1 integration). 182/182 passing.
- [2026-04-27] Completed