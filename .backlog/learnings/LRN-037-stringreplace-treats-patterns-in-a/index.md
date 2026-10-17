---
id: LRN-037
title: String.replace treats $-patterns in a string replacement as commands
status: active
tags: [scripts, patching, javascript, flowstate, skills]
task: TSK-052
created: 2026-10-17
---

## Context

Patching `plugins/flowstate/skills/kickstart/SKILL.md` for PR #6 review round 3 with a node script that ran `text.replace(from, to)` over a list of anchor/replacement pairs. One replacement was skill prose: phrase the value without `"`, `$` or backticks.

## Insight

When the second argument of `String.prototype.replace` is a string, `$` sequences in it are special: `` $` `` inserts the text before the match, `$'` the text after it, `$&` the match itself, `$1` a capture group. The prose contained `` `$` `` followed by a backtick, which reads as `` $` ``, so every replacement pasted the file's prefix back in. SKILL.md went from 120 to 333 lines (four overlapping copies), and the edit tools reported it only as "changed on disk".

## Application

In every file-patching script, pass a replacer function: `text.replace(from, () => to)`, or use `text.split(from).join(to)`. This matters whenever the replacement is prose or code that may contain `$` (shell examples, template literals, regex). After any scripted patch, check the line count and a unique heading count before building on the file.
