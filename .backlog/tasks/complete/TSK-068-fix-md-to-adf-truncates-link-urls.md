---
id: TSK-068
title: Fix: md-to-adf truncates link URLs that contain parentheses
status: complete
priority: P4
tags: [atlassian-polish, adf, md-to-adf]
created: 2026-10-28
source: report/RPT-020
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: md-to-adf truncates link URLs that contain parentheses

## Description

From RPT-020. The link regex at `plugins/atlassian-polish/src/core/md-to-adf.ts:484` uses `[^)\s]+` for the destination, so it stops at the first `)`. CommonMark allows balanced parentheses there.

Repro: `printf 'See [docs](https://x.y/a_(b)) now\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf` gives `href: "https://x.y/a_(b"` followed by the text `") now"`.

## Acceptance Criteria

- [x] [text](https://x.y/a_(b)) yields href https://x.y/a_(b) with no stray ) in the following text
- [x] Unbalanced or titled links keep their current behaviour
- [x] A vitest case in md-to-adf.test.ts covers a link destination with balanced parentheses
- [x] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-28] Created
- [2026-11-07] Started
- [2026-11-07] Merged worktree commits f77c014/0d25b61/f9e4e7a into main. pnpm test: atlassian-polish 44 passed, typecheck and build green, dist rebuilt.
- [2026-11-07] Completed