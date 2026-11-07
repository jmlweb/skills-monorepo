---
id: LRN-059
title: A JS scanner decides division vs regex from the previous token; bail a regex scan at a newline
status: active
tags: [dev-workflow, test-static-scan, parser, javascript]
task: TSK-072
created: 2026-11-07
---

## Context
TSK-072: the quote-aware scanner in `plugins/dev-workflow/src/core/test-blocks.ts` treated `/don't/` as code and the `'` as a string opener, so the rest of the file was swallowed and a test vanished from `test-static-scan`.

## Insight
A `/` is division when the previous non-space char is a value (identifier, number, `)`, `]`, quote) unless that identifier is a keyword (`return`, `typeof`, `in`...); otherwise it opens a regex. `}` is ambiguous: treating it as a value misreads only a statement-initial regex after a block, while the opposite breaks every division after an object literal. Bailing the regex scan at a newline keeps a misread from swallowing lines.

## Application
Reuse `startsRegex` and `skipRegex` from `test-blocks.ts` in any other hand-rolled JS scanner (deslop, harden) instead of adding quote-only skipping.
