---
id: TSK-087
title: Fix: md-to-adf accepts a --jira-base without a scheme and writes broken smart links
status: pending
priority: P4
tags: [atlassian-polish, md-to-adf, validation]
created: 2026-11-13
source: report/RPT-032
depends-on: []
---

# Fix: md-to-adf accepts a --jira-base without a scheme and writes broken smart links

## Description

Source: RPT-032. `--jira-base` and `--projects` are passed to `markdownToAdf` unvalidated (`plugins/atlassian-polish/src/bin/atlassian-polish.ts:85-88`), so `--jira-base acme.atlassian.net` writes `inlineCard` URLs like `acme.atlassian.net/browse/PROJ-12` with exit 0. Reproduction in RPT-032.

## Acceptance Criteria

- [ ] md-to-adf exits 2 with an actionable message when --jira-base is not an absolute http or https URL
- [ ] md-to-adf exits 2 when --projects holds no project key after trimming
- [ ] Integration tests cover a scheme-less base and an empty --projects value
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-13] Created