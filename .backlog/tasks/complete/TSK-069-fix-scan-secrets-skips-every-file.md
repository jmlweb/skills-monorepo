---
id: TSK-069
title: Fix: scan-secrets skips every file when git diff paths lack the b/ prefix
status: complete
priority: P2
tags: []
created: 2026-11-01
source: report/RPT-021
depends-on: []
started: 2026-11-05
completed: 2026-11-05
---

# Fix: scan-secrets skips every file when git diff paths lack the b/ prefix

## Description

### Description
From RPT-021. `scanDiff` (`plugins/dev-workflow/src/commands/scan-secrets.ts:84-87`) only tracks files whose `+++ ` header starts with `b/`. `getStagedDiff`/`getRangeDiff` (`plugins/dev-workflow/src/core/git.ts:30-38`, `:62-72`) inherit user git config, so `diff.noprefix`, `diff.mnemonicPrefix` or a quoted non-ASCII path make the scan report "No secrets detected" with exit 0 while a secret is staged.

### Approach
Pass `--src-prefix=a/ --dst-prefix=b/ --no-ext-diff` and `-c core.quotePath=false` in `git.ts`; in `scanDiff`, never drop added lines of an unrecognized header silently.

## Acceptance Criteria

- [x] scan-secrets finds a staged secret with diff.noprefix=true and with diff.mnemonicPrefix=true set in the repo config
- [x] scan-secrets finds a staged secret in a file with a non-ASCII name under default core.quotePath
- [x] getStagedDiff and getRangeDiff pin the diff header format (explicit prefixes, --no-ext-diff) instead of inheriting user config
- [x] Regression tests cover each case; pnpm test passes
- [x] dist rebuilt and committed

## Notes

## Learnings

- LRN-048: Pin git diff output before parsing it: user config rewrites headers and paths
## Progress Log

- [2026-11-01] Created
- [2026-11-05] Started
- [2026-11-05] criterion 1 — evidence: pnpm vitest run src/core/git.test.ts (diff.noprefix / diff.mnemonicPrefix staged tests failed before fix, pass after) → 37 passed (2026-11-05)
- [2026-11-05] criterion 2 — evidence: pnpm vitest run src/core/git.test.ts (src/café.ts staged and range tests failed before fix, pass after) → passed (2026-11-05)
- [2026-11-05] criterion 3 — evidence: git.ts passes -c core.quotePath=false to every git call and --src-prefix=a/ --dst-prefix=b/ --no-ext-diff to getStagedDiff/getRangeDiff; diff.external test fails before, passes after → passed (2026-11-05)
- [2026-11-05] criterion 4 — evidence: pnpm test from repo root → dev-workflow 167 passed, flowstate 335, atlassian-polish 37, scripts 131 pass 0 fail (2026-11-05)
- [2026-11-05] criterion 5 — evidence: pnpm build then git diff --stat -- '*/dist/**' → dist/core/git.js and dist/commands/scan-secrets.js rebuilt and committed (2026-11-05)
- [2026-11-05] Completed