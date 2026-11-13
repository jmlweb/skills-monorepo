---
id: TSK-083
title: Fix: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags)
status: complete
priority: P3
tags: [flowstate, cli, frontmatter, validation]
created: 2026-11-08
source: report/RPT-028
depends-on: []
started: 2026-11-13
completed: 2026-11-13
---

# Fix: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags)

## Description

Source: RPT-028. `serializeFrontmatter` writes values verbatim (`plugins/flowstate/src/core/frontmatter.ts:53`, `:61`); a newline in a flag value writes an extra `key: value` line that overrides the real one on read (e.g. `--task-id $'TSK-001\nseverity: critical'` turns a low report critical). Only `--title` is checked today. Reproduction in RPT-028.

## Acceptance Criteria

- [x] serializeFrontmatter throws a typed error when a scalar or array item value contains a newline, and no file is written
- [x] report-move/idea-move --task-id, task-block --reason and --tags reject a newline with an actionable message and exit 1
- [x] report-move and idea-move reject a --task-id that is not a task ID
- [x] Tests reproduce the RPT-028 injection cases and assert file contents are unchanged
- [x] dist/ rebuilt and committed

## Notes

## Learnings

- LRN-067: Task IDs can exceed three digits in GitHub mode; validate with TSK-\d{3,}, not parseId
- LRN-068: serializeFrontmatter is the single choke point for injected frontmatter keys
## Progress Log

- [2026-11-08] Created
- [2026-11-13] Started
- [2026-11-13] criterion 1 — evidence: pnpm vitest run src/core/frontmatter.test.ts src/core/fs.test.ts → serializer throws InvalidArgumentError naming the key for scalar \n, scalar \r and array item \n; writeEntity leaves the existing file byte-identical and no tmp file (2026-11-13)
- [2026-11-13] criterion 2 — evidence: pnpm vitest run src/bin/flowstate.integration.test.ts → report-move/idea-move --task-id, task-block --reason, task-create/learning-create/learning-update --tags with a newline exit 1 with 'Invalid --<flag>: it must be a single line' (2026-11-13)
- [2026-11-13] criterion 3 — evidence: pnpm vitest run src/bin/flowstate.integration.test.ts src/core/types.test.ts → report-move/idea-move --task-id banana exit 1 'Invalid --task-id: "banana". Use a task ID like TSK-001'; validateTaskId accepts TSK-001/TSK-1234, rejects PLN-001, TSK-1, tsk-001 (2026-11-13)
- [2026-11-13] criterion 4 — evidence: pnpm vitest run src/bin/flowstate.integration.test.ts → RPT-028 cases (--task-id 'TSK-001\nseverity: critical', --reason 'waiting\npriority: P1', --tags) assert the entity file is byte-identical before/after; flowstate 493/493 pass (2026-11-13)
- [2026-11-13] criterion 5 — evidence: (cd plugins/flowstate && pnpm build) → dist/bin/flowstate.js, dist/core/frontmatter.js, dist/core/types.{js,d.ts} regenerated and staged; no other dist drift (2026-11-13)
- [2026-11-13] Completed