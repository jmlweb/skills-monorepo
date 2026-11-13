---
id: TSK-088
title: Fix: md-to-adf turns a Markdown image into literal text plus a link instead of exiting 2
status: pending
priority: P4
tags: [atlassian-polish, md-to-adf]
created: 2026-11-13
source: report/RPT-033
depends-on: []
---

# Fix: md-to-adf turns a Markdown image into literal text plus a link instead of exiting 2

## Description

Source: RPT-033. The inline parser knows only `[text](url)` (`plugins/atlassian-polish/src/core/md-to-adf.ts:463`), so `![alt](url)` becomes a stray `!` plus a link and `![](blob:…)` becomes literal text, with exit 0, against the documented exit-2 contract for unconvertible input. Reproduction in RPT-033.

## Acceptance Criteria

- [ ] Image syntax outside code spans and fences exits 2 with a line N: message naming the image
- [ ] An inline blob: image as the MCP returns it exits 2 the same way
- [ ] md-to-adf.test.ts covers both cases and references/atlassian-formats.md lists images among the exit-2 cases
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-13] Created