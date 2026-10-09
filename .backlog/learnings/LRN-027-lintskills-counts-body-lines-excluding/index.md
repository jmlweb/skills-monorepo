---
id: LRN-027
title: lint:skills counts body lines excluding frontmatter
status: active
tags: [lint-skills, skills, writing-rules]
task: TSK-035
created: 2026-10-09
---

## Context
lint:skills measured a 177-line file as a 168-line body, while the task wants the file under 150.
## Insight
Keeping the whole file at 150 lines or fewer satisfies both. Blank lines after headings and Done-when lines add up.
## Application
Put Done-when directly under step text without blank line; move detail into conditional references.
