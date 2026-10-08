---
id: TSK-047
title: Guard against hand-edited backlog index and status/folder drift
status: complete
priority: P3
tags: [ci, backlog, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
started: 2026-10-08
completed: 2026-10-08
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

- LRN-020: task-create leaves index.md one trailing line short of index-rebuild output
- LRN-021: Worktree guard rejects compound or variable-driven Bash commands
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started
- [2026-10-08] Completed