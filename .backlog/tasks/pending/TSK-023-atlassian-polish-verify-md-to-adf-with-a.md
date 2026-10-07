---
id: TSK-023
title: atlassian-polish: verify md-to-adf with a real Jira write
status: pending
priority: P2
tags: [atlassian-polish, adf, jira, verification]
created: 2026-10-07
source: TSK-017
depends-on: []
---

# atlassian-polish: verify md-to-adf with a real Jira write

## Description

TSK-017 shipped the `md-to-adf` converter, and Jira descriptions are now always written as ADF (1185135). Its criterion 5 (a real write on a ticket with a checklist, a table and code marks) was never recorded, so the write path is covered only by unit tests.

Before writing:

- The write is outward-facing. Pick a ticket where an edit is acceptable and get the user's go-ahead.
- TSK-018 criterion 5 also needs a real-ticket test (panel, mention, screenshot). If one ticket has all six kinds of content, one write covers both tasks.
- Recovery if the write goes wrong: the step 5 backup folder, or the issue's History tab.


## Acceptance Criteria

- [ ] Polish one real Jira ticket containing a checklist, a table and code marks (inline code and a code block) with an ADF write via md-to-adf
- [ ] After the write, the Jira UI shows the checklist, table and code marks intact (no flattening, no raw Markdown)
- [ ] Record the ticket key, date and result in this task progress log
- [ ] Any defect found is filed with /flowstate:report

## Notes

## Learnings

## Progress Log

- [2026-10-07] Created