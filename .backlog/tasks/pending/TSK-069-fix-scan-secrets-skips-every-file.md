---
id: TSK-069
title: Fix: scan-secrets skips every file when git diff paths lack the b/ prefix
status: pending
priority: P2
tags: []
created: 2026-11-01
source: report/RPT-021
depends-on: []
---

# Fix: scan-secrets skips every file when git diff paths lack the b/ prefix

## Description

### Description
From RPT-021. `scanDiff` (`plugins/dev-workflow/src/commands/scan-secrets.ts:84-87`) only tracks files whose `+++ ` header starts with `b/`. `getStagedDiff`/`getRangeDiff` (`plugins/dev-workflow/src/core/git.ts:30-38`, `:62-72`) inherit user git config, so `diff.noprefix`, `diff.mnemonicPrefix` or a quoted non-ASCII path make the scan report "No secrets detected" with exit 0 while a secret is staged.

### Approach
Pass `--src-prefix=a/ --dst-prefix=b/ --no-ext-diff` and `-c core.quotePath=false` in `git.ts`; in `scanDiff`, never drop added lines of an unrecognized header silently.

## Acceptance Criteria

- [ ] scan-secrets finds a staged secret with diff.noprefix=true and with diff.mnemonicPrefix=true set in the repo config
- [ ] scan-secrets finds a staged secret in a file with a non-ASCII name under default core.quotePath
- [ ] getStagedDiff and getRangeDiff pin the diff header format (explicit prefixes, --no-ext-diff) instead of inheriting user config
- [ ] Regression tests cover each case; pnpm test passes
- [ ] dist rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-01] Created