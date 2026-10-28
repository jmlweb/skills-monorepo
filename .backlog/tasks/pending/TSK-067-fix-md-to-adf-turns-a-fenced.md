---
id: TSK-067
title: Fix: md-to-adf turns a fenced code block inside a list item into inline text
status: pending
priority: P3
tags: []
created: 2026-10-28
source: report/RPT-019
depends-on: []
---

# Fix: md-to-adf turns a fenced code block inside a list item into inline text

## Description

From RPT-019. `plugins/atlassian-polish/src/core/md-to-adf.ts:284-287` pushes every indented non-item line under a list item into `continuation` after `.trim()`, with no fence check. A nested fence becomes `item ``` + code-marked ` code ` + ``` `` ``` in one paragraph, and exit is 0.

Repro: `printf -- '- item\n  ```\n  code\n  ```\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf`.

## Acceptance Criteria

- [ ] A fenced code block indented under a list item becomes a codeBlock inside the listItem with its newlines kept, or md-to-adf exits 2 with a line N: message at the fence
- [ ] No literal backtick fence markers leak into list item text
- [ ] A vitest case in md-to-adf.test.ts covers a fence nested in a bullet item
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-28] Created