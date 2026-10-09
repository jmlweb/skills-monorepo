---
id: TSK-042
title: Fix: review-idea approve nests idea headings under empty Description and duplicates Notes
status: complete
priority: P4
tags: [flowstate, cli, review-idea, templates]
created: 2026-10-08
source: report/RPT-006
depends-on: []
started: 2026-10-09
completed: 2026-10-09
---

# Fix: review-idea approve nests idea headings under empty Description and duplicates Notes

## Description

`review-idea` step 5a pipes the idea's Goal/Context/Approach/Notes verbatim into `task-create --body -`. `task-create` (`src/commands/task-create.ts`) puts the body under its own `## Description` and appends a template `## Notes`. Result: empty Description followed by sibling `## Goal`, `## Approach`; an idea `## Notes` duplicates the template one.

### Evidence
- TSK-021, TSK-025..TSK-041: `## Description` followed directly by `## Goal`.
- TSK-024, TSK-025, TSK-026: two `## Notes` headings.

### Notes
- Prefer the CLI fix: any skill that pipes Markdown into `--body` benefits.
- TSK-036 also edits review-idea headings; don't run in parallel with it.


## Acceptance Criteria

- [x] Tasks created via review-idea approve have a non-empty Description holding the idea Goal/Context/Approach (no sibling ## headings from the idea) — evidence: task-create.test.ts idea-style body: nests under Description → pass (2026-10-09)
- [x] An idea Notes section is merged into the single task Notes section; no task gets two ## Notes — evidence: task-create.test.ts merges idea Notes → pass (2026-10-09)
- [x] Fix lives in task-create (demote ## headings in --body, merge a body Notes into template Notes) with a vitest test asserting real file content, or in review-idea step 5a if the CLI change is rejected — evidence: embedUnderDescription in core/markdown.ts + task-create.ts; pnpm test 275 pass (2026-10-09)
- [x] task-condense and task-compress still act on the single Notes section (test) — evidence: task-create.test.ts task-condense case → pass (2026-10-09)
- [x] Existing duplicate-Notes tasks (TSK-024, TSK-025, TSK-026) repaired via CLI, not hand edits — evidence: task-normalize TSK-024/025/026 → one ## Notes each (2026-10-09)

## Notes

## Learnings

- LRN-030: Section helpers in markdown.ts are not fence-aware
## Progress Log

- [2026-10-08] Created
- [2026-10-09] Started
- [2026-10-09] Fixed in task-create (embedUnderDescription: lift idea Notes, demote ## headings, fence-aware). Added task-normalize command to merge duplicate Notes; repaired TSK-024/025/026 through it.
- [2026-10-09] Completed