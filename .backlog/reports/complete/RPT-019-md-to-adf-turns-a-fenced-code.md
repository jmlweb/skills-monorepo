---
id: RPT-019
title: md-to-adf turns a fenced code block inside a list item into inline text with stray backticks
type: bug
severity: medium
status: triaged
created: 2026-10-28
triaged: 2026-10-28
task-id: TSK-067
---

## Summary

A fenced code block indented under a list item is not recognised as a fence. `parseList` treats its lines as paragraph continuation: it trims them, joins them with spaces, and runs inline parsing. The block's newlines are lost and the fence markers leak as literal backticks. Exit code is 0.

## Location

`plugins/atlassian-polish/src/core/md-to-adf.ts:284-287` — any indented non-item line under an item is pushed to `continuation` after `.trim()`; there is no fence check, unlike `parseBlocks` (`:141`).

## Reproduction

```bash
printf -- '- item\n  ```\n  code\n  ```\n' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf
```

Observed (exit 0):

```json
{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"item ``"},{"type":"text","text":" code ","marks":[{"type":"code"}]},{"type":"text","text":"``"}]}]}
```

## Expected

`plugins/atlassian-polish/references/atlassian-formats.md:56-62` lists fenced code as supported and says the converter exits 2 with a `line N:` message on input it can't convert, rather than dropping content. Either emit a `codeBlock` inside the `listItem` (ADF allows it) or throw `MarkdownConversionError` at the fence line, as the checklist-nesting case does at `:295`.
