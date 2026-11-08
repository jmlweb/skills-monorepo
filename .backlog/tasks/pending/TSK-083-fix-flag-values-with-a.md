---
id: TSK-083
title: Fix: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags)
status: pending
priority: P3
tags: [flowstate, cli, frontmatter, validation]
created: 2026-11-08
source: report/RPT-028
depends-on: []
---

# Fix: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags)

## Description

Source: RPT-028. `serializeFrontmatter` writes values verbatim (`plugins/flowstate/src/core/frontmatter.ts:53`, `:61`); a newline in a flag value writes an extra `key: value` line that overrides the real one on read (e.g. `--task-id $'TSK-001\nseverity: critical'` turns a low report critical). Only `--title` is checked today. Reproduction in RPT-028.

## Acceptance Criteria

- [ ] serializeFrontmatter throws a typed error when a scalar or array item value contains a newline, and no file is written
- [ ] report-move/idea-move --task-id, task-block --reason and --tags reject a newline with an actionable message and exit 1
- [ ] report-move and idea-move reject a --task-id that is not a task ID
- [ ] Tests reproduce the RPT-028 injection cases and assert file contents are unchanged
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-08] Created