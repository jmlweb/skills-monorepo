---
id: RPT-018
title: md-to-adf silently drops table cells beyond the header width
type: bug
severity: medium
status: triaged
created: 2026-10-28
triaged: 2026-10-28
task-id: TSK-066
---

## Summary

`md-to-adf` builds every table row with exactly `header.length` cells. A body row with more cells than the header loses the extra cells with no error and exit 0.

## Location

`plugins/atlassian-polish/src/core/md-to-adf.ts:374-377` — `const width = header.length;` then `Array.from({ length: width }, …)` reads only `cells[0..width-1]`.

## Reproduction

```bash
printf '| a | b |\n|---|---|\n| 1 | 2 | 3 |\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf
```

Observed (exit 0): the body row holds two `tableCell` nodes, `1` and `2`. The text `3` appears nowhere in the output.

## Expected

`plugins/atlassian-polish/references/atlassian-formats.md:56-62` says the converter exits 2 with a `line N:` message on input it can't convert, and "fix the Markdown, don't drop the content". A row wider than its header should raise `MarkdownConversionError` with the row's line number (or keep the cells), never drop them silently. The write goes to a real Jira description, so the loss reaches users.
