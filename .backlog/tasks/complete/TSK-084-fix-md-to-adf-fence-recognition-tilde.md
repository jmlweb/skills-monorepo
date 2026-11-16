---
id: TSK-084
title: Fix: md-to-adf fence recognition (tilde fences, info strings, longer fences)
status: complete
priority: P3
tags: [atlassian-polish, md-to-adf]
created: 2026-11-10
source: report/RPT-029
depends-on: []
started: 2026-11-16
completed: 2026-11-16
---

# Fix: md-to-adf fence recognition (tilde fences, info strings, longer fences)

## Description

md-to-adf's FENCE_RE/CLOSE_FENCE_RE (plugins/atlassian-polish/src/core/md-to-adf.ts:21-22) accept only exactly three backticks with a [\w+-] info string. Follow CommonMark fence rules. See RPT-029 for reproductions.

## Acceptance Criteria

- [x] A ~~~ fenced block converts to a codeBlock node, not strike text
- [x] Info strings with #, . or spaces (c#, .env, shell script) open a fence; language is the first word
- [x] A fence of four or more backticks or tildes closes only on a matching fence of at least the same length and character
- [x] Tests in md-to-adf.test.ts cover each case, and references/atlassian-formats.md matches the behaviour

## Notes

## Learnings

- LRN-069: md-to-adf inline code only pairs single backticks, so backtick fence info strings must reject backticks
## Progress Log

- [2026-11-10] Created
- [2026-11-16] Started
- [2026-11-16] criterion 1 — evidence: printf '~~~\ncode\n~~~' | node dist/bin/atlassian-polish.js md-to-adf → codeBlock with text 'code', no strike; vitest 'converts a tilde fence…' + nested tilde test pass (2026-11-16)
- [2026-11-16] criterion 2 — evidence: md-to-adf on ```c#, ```.env, ```shell script → codeBlock language c#, .env, shell; vitest it.each 'opens a fence on info string' 5/5 pass (2026-11-16)
- [2026-11-16] criterion 3 — evidence: printf four-backtick/three-backtick/four-backtick | md-to-adf → codeBlock text '```'; vitest 'closes a longer fence only on the same character…', 'keeps backtick lines inside a tilde fence', 'throws at the opener when a long fence…' pass (2026-11-16)
- [2026-11-16] criterion 4 — evidence: pnpm vitest run src/core/md-to-adf.test.ts → 35 passed (11 new, all failed before the fix); references/atlassian-formats.md documents CommonMark fence rules and first-word language (2026-11-16)
- [2026-11-16] Completed