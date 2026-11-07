---
id: TSK-072
title: Fix: test-static-scan drops a test whose body holds a quote inside a regex literal
status: active
priority: P3
tags: [dev-workflow, test-static-scan]
created: 2026-11-05
source: report/RPT-024
depends-on: []
started: 2026-11-07
---

# Fix: test-static-scan drops a test whose body holds a quote inside a regex literal

## Description

See RPT-024. `findClosing` and `skipString` in `plugins/dev-workflow/src/core/test-blocks.ts` treat any quote as a string opener, so a quote inside a regex literal swallows the rest of the call and the test is silently dropped from `test-static-scan`.

## Acceptance Criteria

- [ ] findClosing in plugins/dev-workflow/src/core/test-blocks.ts skips regex literals so quotes inside them do not open a string
- [ ] A vitest case with toMatch(/don't/) followed by a second test yields two blocks from extractTestBlocks
- [ ] Division expressions (a / b) are not mistaken for regex literals, covered by a test
- [ ] test-static-scan reports tests: 2 on the RPT-024 reproduction file

## Notes

## Learnings

## Progress Log

- [2026-11-05] Created
- [2026-11-07] Started