# Flowstate Templates Reference

All templates used by flowstate commands. Commands reference this file for consistent formatting.

---

## Task Template

File: `tasks/pending/TSK-XXX-slug.md`

```markdown
---
id: TSK-XXX
title: {{TITLE}}
status: pending
priority: {{P1|P2|P3|P4}}
tags: [{{tag1}}, {{tag2}}]
created: {{YYYY-MM-DD}}
source: {{manual|plan/PLN-XXX|report/RPT-XXX}}
depends-on: []
---

# {{TITLE}}

## Description

{{DESCRIPTION}}

## Acceptance Criteria

- [ ] {{CRITERION_1}}
- [ ] {{CRITERION_2}}

## Notes

## Learnings

## Progress Log

- [{{YYYY-MM-DD}}] Created
```

### Task Frontmatter Fields (added on lifecycle transitions)

- `started: YYYY-MM-DD` — when task moves to active
- `completed: YYYY-MM-DD` — when task is completed
- `blocked-by: reason` — when task is blocked

---

## Idea Template

File: `ideas/pending/PLN-XXX-slug.md`

```markdown
---
id: PLN-XXX
title: {{TITLE}}
status: pending
created: {{YYYY-MM-DD}}
complexity: {{low|medium|high}}
---

# {{TITLE}}

## Goal

{{What we want to achieve}}

## Context

{{Why this is needed, what prompted it}}

## Approach

1. {{Step 1}}
2. {{Step 2}}
3. {{Step 3}}

## Files to Modify

- `path/to/file.ext` — {{what changes}}

## Risks & Considerations

- {{Risk 1}}

## Open Questions

- {{Question 1}}
```

### Plan Frontmatter Fields (added on review)

- `reviewed: YYYY-MM-DD`
- `task-id: TSK-XXX` — when approved
- `status: approved|discarded`

---

## Report Template

File: `reports/pending/RPT-XXX-slug.md`

```markdown
---
id: RPT-XXX
title: {{TITLE}}
type: {{bug|finding|improvement|security}}
severity: {{critical|high|medium|low}}
status: pending
created: {{YYYY-MM-DD}}
---

# {{TITLE}}

## Summary

{{Brief description}}

## Details

{{Detailed explanation}}

## Steps to Reproduce

1. {{Step 1}}
2. {{Step 2}}
3. Expected: {{EXPECTED}}
4. Actual: {{ACTUAL}}

## Evidence

{{Error messages, code references, logs}}

## Suggested Fix

{{Optional proposed solution}}
```

### Report Frontmatter Fields (added on triage)

- `triaged: YYYY-MM-DD`
- `task-id: TSK-XXX` — when converted to task
- `status: triaged|discarded`

---

## Learning Template

Directory: `learnings/LRN-XXX-slug/`
File: `learnings/LRN-XXX-slug/index.md`

```markdown
---
id: LRN-XXX
title: {{TITLE}}
status: active
tags: [{{tag1}}, {{tag2}}]
task: {{TSK-XXX or empty}}
created: {{YYYY-MM-DD}}
---

# {{TITLE}}

## Context

{{What was being attempted}}

## Insight

{{The non-obvious discovery}}

## Application

{{How to apply this: what to do or avoid}}
```

---

## Index Templates

### tasks/index.md

```markdown
# {{PROJECT_NAME}} - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 0 |
| Active | 0 |
| Blocked | 0 |
| Complete | 0 |

## Active Tasks

_No active tasks._

## Pending Tasks

| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
```

### learnings/index.md

```markdown
# {{PROJECT_NAME}} - Learnings Index

> Consult a learning's full document before starting related work.

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|
```

---

## ID Generation

For each type, scan ALL subdirectories to find the max existing ID:

```bash
# Tasks (adapt prefix for PLN, RPT)
next_id=$(ls .backlog/tasks/{pending,active,complete}/ 2>/dev/null | grep -oP 'TSK-\K\d+' | sort -n | tail -1)
next_id=$(printf "%03d" $(( ${next_id:-0} + 1 )))

# Ideas
next_id=$(ls .backlog/ideas/{pending,complete}/ 2>/dev/null | grep -oP 'PLN-\K\d+' | sort -n | tail -1)
next_id=$(printf "%03d" $(( ${next_id:-0} + 1 )))

# Reports
next_id=$(ls .backlog/reports/{pending,complete}/ 2>/dev/null | grep -oP 'RPT-\K\d+' | sort -n | tail -1)
next_id=$(printf "%03d" $(( ${next_id:-0} + 1 )))

# Learnings (directories, not files)
next_id=$(ls .backlog/learnings/ 2>/dev/null | grep -oP 'LRN-\K\d+' | sort -n | tail -1)
next_id=$(printf "%03d" $(( ${next_id:-0} + 1 )))
```

**Slug**: lowercase, hyphen-separated, max 5 words derived from the title.
