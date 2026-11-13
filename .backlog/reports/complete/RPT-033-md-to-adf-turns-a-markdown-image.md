---
id: RPT-033
title: md-to-adf turns a Markdown image into literal text plus a link instead of exiting 2
type: bug
severity: low
status: triaged
created: 2026-11-13
triaged: 2026-11-13
task-id: TSK-088
---

## What happens

`plugins/atlassian-polish/references/atlassian-formats.md:62-64` documents that md-to-adf exits 2 with a `line N:` message on input it cannot convert, so content is fixed rather than dropped. Markdown images are such input (the same file, line 31, says `![](file.png)` cannot become an ADF `mediaSingle`), yet md-to-adf converts them silently with exit 0:

- `![alt](https://x/y.png)` becomes a text node `!` followed by `alt` with a `link` mark: the image turns into a stray `!` and a link.
- An inline Jira image as the MCP returns it, `![](blob:https://media…)` (see `references/lossy-content.md:11`), becomes the literal text `![](blob:` plus a bare-URL link plus `)`.

The inline parser only knows `[text](url)` links (`LINK_OPEN_RE`, `plugins/atlassian-polish/src/core/md-to-adf.ts:463`), so the `!` prefix is left as text. No test covers image syntax.

## Reproduction

```
printf 'Intro\n\n![](blob:https://media.example/?type=file&id=abc)\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf
```

Observed (exit 0):

```
{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Intro"}]},{"type":"paragraph","content":[{"type":"text","text":"![](blob:"},{"type":"text","text":"https://media.example/?type=file&id=abc","marks":[{"type":"link","attrs":{"href":"https://media.example/?type=file&id=abc"}}]},{"type":"text","text":")"}]}]}
```

## Expected

Image syntax outside code is an exit-2 `line N:` error naming the image, like the other unconvertible input, and the reference lists images among the exit-2 cases.
