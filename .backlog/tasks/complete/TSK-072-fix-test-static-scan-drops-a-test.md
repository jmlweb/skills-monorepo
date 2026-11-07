---
id: TSK-072
title: Fix: test-static-scan drops a test whose body holds a quote inside a regex literal
status: complete
priority: P3
tags: [dev-workflow, test-static-scan]
created: 2026-11-05
source: report/RPT-024
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: test-static-scan drops a test whose body holds a quote inside a regex literal

## Description

See RPT-024. `findClosing` and `skipString` in `plugins/dev-workflow/src/core/test-blocks.ts` treat any quote as a string opener, so a quote inside a regex literal swallows the rest of the call and the test is silently dropped from `test-static-scan`.

## Acceptance Criteria

- [x] findClosing in plugins/dev-workflow/src/core/test-blocks.ts skips regex literals so quotes inside them do not open a string
- [x] A vitest case with toMatch(/don't/) followed by a second test yields two blocks from extractTestBlocks
- [x] Division expressions (a / b) are not mistaken for regex literals, covered by a test
- [x] test-static-scan reports tests: 2 on the RPT-024 reproduction file — evidence: test-static-scan --cwd <rpt024 fixture> --json true reports tests: 2 (2026-11-07)

## Notes

## Learnings

- LRN-059: A JS scanner decides division vs regex from the previous token; bail a regex scan at a newline
## Progress Log

- [2026-11-05] Created
- [2026-11-07] Started
- [2026-11-07] Merged dc52857 into main; dev-workflow 216 tests pass.
- [2026-11-07] Completed