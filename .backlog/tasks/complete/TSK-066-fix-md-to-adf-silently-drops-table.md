---
id: TSK-066
title: Fix: md-to-adf silently drops table cells beyond the header width
status: complete
priority: P3
tags: [atlassian-polish, adf, md-to-adf]
created: 2026-10-28
source: report/RPT-018
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: md-to-adf silently drops table cells beyond the header width

## Description

From RPT-018. `plugins/atlassian-polish/src/core/md-to-adf.ts:374-377` sizes every row to `header.length`, so extra body cells are dropped with exit 0. The documented contract (`references/atlassian-formats.md:56-62`) is to exit 2 rather than drop content.

Repro: `printf '| a | b |\n|---|---|\n| 1 | 2 | 3 |\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf` gives no `3` in the output.

## Acceptance Criteria

- [x] A table body row with more cells than the header no longer loses cells silently: md-to-adf exits 2 with a line N: message naming the row, or keeps every cell
- [x] A vitest case in md-to-adf.test.ts covers a row wider than its header
- [x] references/atlassian-formats.md describes the chosen behaviour
- [x] dist/ rebuilt and committed

## Notes

## Learnings

- LRN-051: A wider table row cannot be told apart from an unescaped pipe, so md-to-adf refuses it
## Progress Log

- [2026-10-28] Created
- [2026-11-07] Started
- [2026-11-07] Merged worktree commits f77c014/0d25b61/f9e4e7a into main. pnpm test: atlassian-polish 44 passed, typecheck and build green, dist rebuilt.
- [2026-11-07] Completed