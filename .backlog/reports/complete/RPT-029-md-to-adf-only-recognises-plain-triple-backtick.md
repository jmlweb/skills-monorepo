---
id: RPT-029
title: md-to-adf only recognises plain triple-backtick fences: tilde fences become strike text, info strings with # . or space fail
type: bug
severity: medium
status: triaged
created: 2026-11-10
triaged: 2026-11-10
task-id: TSK-084
---

## Summary
`plugins/atlassian-polish/src/core/md-to-adf.ts:21-22` defines the fence regexes as
`/^\s*```\s*([\w+-]*)\s*$/` and `/^\s*```\s*$/`. Only a run of exactly three backticks with an
info string of `[\w+-]` characters opens a fence. `references/atlassian-formats.md:56` documents
"fenced code" support without these limits.

## Reproduction
Run from `plugins/atlassian-polish` after `pnpm build`.

1. Tilde fence, silent corruption, exit 0:

   printf '~~~\ncode\n~~~' | node dist/bin/atlassian-polish.js md-to-adf

   Observed: `{"type":"paragraph","content":[{"type":"text","text":"~ code ","marks":[{"type":"strike"}]},{"type":"text","text":"~"}]}`
   Expected: a `codeBlock` node holding `code`.

2. Info string with `#`, `.` or a space, misleading error, exit 2:

   printf '```c#\nx\n```' | node dist/bin/atlassian-polish.js md-to-adf

   Observed: `Error: line 3: unclosed code fence`. The same happens for ```` ```.env ```` and
   ```` ```shell script ````. The opening line misses `FENCE_RE`, so the closing fence on line 3
   is read as an opener. The error points at the wrong line and the wrong cause.

3. Four-backtick fence (used to show triple backticks inside code):

   printf '````\n```\n````' | node dist/bin/atlassian-polish.js md-to-adf

   Observed: `Error: line 2: unclosed code fence`.

## Impact
Markdown written by users or by the atlassian skills that uses `~~~` reaches Jira as
strikethrough prose with the code lost. Common languages such as `c#` cannot be fenced at all.

## Suggested fix
Accept CommonMark fences: three or more backticks or tildes, the closing fence using the same
character and at least the opening length, and any info string without backticks. Use the first
word of the info string as `language`.
