---
id: TSK-084
title: Fix: md-to-adf fence recognition (tilde fences, info strings, longer fences)
status: pending
priority: P3
tags: [atlassian-polish, md-to-adf]
created: 2026-11-10
source: report/RPT-029
depends-on: []
---

# Fix: md-to-adf fence recognition (tilde fences, info strings, longer fences)

## Description

md-to-adf's FENCE_RE/CLOSE_FENCE_RE (plugins/atlassian-polish/src/core/md-to-adf.ts:21-22) accept only exactly three backticks with a [\w+-] info string. Follow CommonMark fence rules. See RPT-029 for reproductions.

## Acceptance Criteria

- [ ] A ~~~ fenced block converts to a codeBlock node, not strike text
- [ ] Info strings with #, . or spaces (c#, .env, shell script) open a fence; language is the first word
- [ ] A fence of four or more backticks or tildes closes only on a matching fence of at least the same length and character
- [ ] Tests in md-to-adf.test.ts cover each case, and references/atlassian-formats.md matches the behaviour

## Notes

## Learnings

## Progress Log

- [2026-11-10] Created