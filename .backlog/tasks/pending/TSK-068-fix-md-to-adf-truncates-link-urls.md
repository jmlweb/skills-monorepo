---
id: TSK-068
title: Fix: md-to-adf truncates link URLs that contain parentheses
status: pending
priority: P4
tags: []
created: 2026-10-28
source: report/RPT-020
depends-on: []
---

# Fix: md-to-adf truncates link URLs that contain parentheses

## Description

From RPT-020. The link regex at `plugins/atlassian-polish/src/core/md-to-adf.ts:484` uses `[^)\s]+` for the destination, so it stops at the first `)`. CommonMark allows balanced parentheses there.

Repro: `printf 'See [docs](https://x.y/a_(b)) now\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf` gives `href: "https://x.y/a_(b"` followed by the text `") now"`.

## Acceptance Criteria

- [ ] [text](https://x.y/a_(b)) yields href https://x.y/a_(b) with no stray ) in the following text
- [ ] Unbalanced or titled links keep their current behaviour
- [ ] A vitest case in md-to-adf.test.ts covers a link destination with balanced parentheses
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-28] Created