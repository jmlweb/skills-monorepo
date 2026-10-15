---
id: LRN-032
title: Node 24 default test reporter prints 'ℹ pass N', not TAP's '# pass N'
status: active
tags: [testing, node-test, parsing]
task: TSK-050
created: 2026-10-15
---

## Context
prune-tests reads the passed-case count from the test runner output to prove no test case was lost. It only knew the TAP line `# pass N`.

## Insight
Node 24's default spec reporter prints `ℹ pass N`. A parser that only handles TAP reads every run as "count unknown", so every rewrite fails the case check, even when it's correct.

## Application
Parse runner output from the real default reporter, not from memory, and paste a sample into the test. Covered in `plugins/dev-workflow/src/core/test-output.ts`. Re-check the parser whenever the Node major version changes.
