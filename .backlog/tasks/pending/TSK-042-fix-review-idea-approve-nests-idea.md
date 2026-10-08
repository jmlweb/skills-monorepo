---
id: TSK-042
title: Fix: review-idea approve nests idea headings under empty Description and duplicates Notes
status: pending
priority: P4
tags: [flowstate, cli, review-idea, templates]
created: 2026-10-08
source: report/RPT-006
depends-on: []
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

- [ ] Tasks created via review-idea approve have a non-empty Description holding the idea Goal/Context/Approach (no sibling ## headings from the idea)
- [ ] An idea Notes section is merged into the single task Notes section; no task gets two ## Notes
- [ ] Fix lives in task-create (demote ## headings in --body, merge a body Notes into template Notes) with a vitest test asserting real file content, or in review-idea step 5a if the CLI change is rejected
- [ ] task-condense and task-compress still act on the single Notes section (test)
- [ ] Existing duplicate-Notes tasks (TSK-024, TSK-025, TSK-026) repaired via CLI, not hand edits

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created