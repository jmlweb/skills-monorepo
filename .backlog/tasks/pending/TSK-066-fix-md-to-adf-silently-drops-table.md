---
id: TSK-066
title: Fix: md-to-adf silently drops table cells beyond the header width
status: pending
priority: P3
tags: []
created: 2026-10-28
source: report/RPT-018
depends-on: []
---

# Fix: md-to-adf silently drops table cells beyond the header width

## Description

From RPT-018. `plugins/atlassian-polish/src/core/md-to-adf.ts:374-377` sizes every row to `header.length`, so extra body cells are dropped with exit 0. The documented contract (`references/atlassian-formats.md:56-62`) is to exit 2 rather than drop content.

Repro: `printf '| a | b |\n|---|---|\n| 1 | 2 | 3 |\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf` gives no `3` in the output.

## Acceptance Criteria

- [ ] A table body row with more cells than the header no longer loses cells silently: md-to-adf exits 2 with a line N: message naming the row, or keeps every cell
- [ ] A vitest case in md-to-adf.test.ts covers a row wider than its header
- [ ] references/atlassian-formats.md describes the chosen behaviour
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-28] Created