---
id: LRN-051
title: A wider table row cannot be told apart from an unescaped pipe, so md-to-adf refuses it
status: active
tags: [atlassian-polish, md-to-adf, tables, design]
task: TSK-066
created: 2026-11-07
---

## Context
TSK-066 asked to keep extra body cells when unambiguous, else exit 2.

## Insight
With one row wider than the header there is no signal separating "extra column" from "literal `|` the author forgot to escape". GFM silently drops the cells; widening the table would plant an empty header column in a live Jira description. Only trailing empty cells (a stray `|`) are safe to drop.

## Application
Non-empty overflow is an exit-2 error with an actionable message (`escape literal pipes as \| or add header columns`). If consistent-width overflow across all rows ever matters, add a widening rule then and document it in `references/atlassian-formats.md`.
