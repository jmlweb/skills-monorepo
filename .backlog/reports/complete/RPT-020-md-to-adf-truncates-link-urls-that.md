---
id: RPT-020
title: md-to-adf truncates link URLs that contain parentheses
type: bug
severity: low
status: triaged
created: 2026-10-28
triaged: 2026-10-28
task-id: TSK-068
---

## Summary

The inline link regex stops the URL at the first `)`. A URL that contains balanced parentheses, which are common in Wikipedia and MSDN links, gets a truncated `href`. The rest of the URL leaks into the text as a literal `)`. Exit code is 0.

## Location

`plugins/atlassian-polish/src/core/md-to-adf.ts:484` — `/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/`; `[^)\s]+` cannot include `)`.

## Reproduction

```bash
printf 'See [docs](https://x.y/a_(b)) now\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf
```

Observed (exit 0):

```json
{"type":"paragraph","content":[{"type":"text","text":"See "},{"type":"text","text":"docs","marks":[{"type":"link","attrs":{"href":"https://x.y/a_(b"}}]},{"type":"text","text":") now"}]}
```

## Expected

`href` is `https://x.y/a_(b)` and the following text is ` now`. This is the CommonMark rule for balanced parentheses in link destinations. The Jira link written today points to a broken URL.
