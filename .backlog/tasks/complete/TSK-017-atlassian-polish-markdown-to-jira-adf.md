---
id: TSK-017
title: atlassian-polish: Markdown to Jira ADF converter script
status: complete
priority: P1
tags: [atlassian-polish, adf, tooling]
created: 2026-10-01
source: manual
depends-on: []
started: 2026-10-01
completed: 2026-10-01
---

# atlassian-polish: Markdown to Jira ADF converter script

## Description

v0.4.1 writes Jira checklists via editJiraIssue with contentFormat adf (verified on CF-574), but the main session converts the whole body to ADF by hand. That is error-prone and slow.

Add a converter that turns the formatter's Markdown body into an ADF document so the write step stops hand-building ADF JSON.

The plugin is currently prompt-only (no src/dist). Decide between a CLI under the plugin (needs src, dist, tests, pre-commit rebuild) or a small bundled node script, and note the road not taken in the summary.


## Acceptance Criteria

- [ ] Converter handles headings, paragraphs, bullet/numbered lists, tables, code marks, links, and - [ ] / - [x] items as taskList/taskItem with fresh localIds
- [ ] Zero runtime dependencies, ESM, Node16 resolution
- [ ] Colocated tests assert on real ADF output
- [ ] polish-atlassian SKILL.md step 8 and atlassian-formats.md section 1 call the converter instead of hand-building ADF
- [ ] Verified by a real write on a Jira ticket containing a checklist, a table and code marks
- [ ] Design note records the choice between a CLI with src/dist and a bundled node script, and the road not taken

## Notes

## Learnings

## Progress Log

- [2026-10-01] Created
- [2026-10-01] Started
- [2026-10-01] Completed