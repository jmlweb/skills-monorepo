---
id: TSK-047
title: Guard against hand-edited backlog index and status/folder drift
status: pending
priority: P3
tags: [ci, backlog, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
---

# Guard against hand-edited backlog index and status/folder drift

## Description

From AGENTS.md mistake 8. Add a CI or pre-commit check that runs index-rebuild and fails on a diff in .backlog/**/index.md, plus a check that frontmatter status matches the folder.

## Acceptance Criteria

- [ ] Hand-edited index.md fails the check
- [ ] Status/folder mismatch is reported
- [ ] Passes on the current backlog

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created