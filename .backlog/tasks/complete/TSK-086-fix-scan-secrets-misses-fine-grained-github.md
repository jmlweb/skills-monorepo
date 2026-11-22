---
id: TSK-086
title: Fix: scan-secrets misses fine-grained GitHub tokens (github_pat_)
status: complete
priority: P3
tags: [dev-workflow, scan-secrets, security]
created: 2026-11-13
source: report/RPT-031
depends-on: []
started: 2026-11-22
completed: 2026-11-22
---

# Fix: scan-secrets misses fine-grained GitHub tokens (github_pat_)

## Description

Source: RPT-031. The only GitHub pattern in `plugins/dev-workflow/src/commands/scan-secrets.ts:42` is `gh[pousr]_`, so fine-grained PATs (`github_pat_…`) pass the pre-commit scan. Add a pattern for them. Reproduction in RPT-031.

## Acceptance Criteria

- [x] scan-secrets reports a staged github_pat_ token as a GitHub token with file and line
- [x] scan-secrets.test.ts covers a fine-grained token and still covers the classic gh*_ prefixes
- [x] dist/ rebuilt and committed

## Notes

## Learnings

- LRN-071: pnpm build via turbo can fail with Exec format error; run per-package scripts with pnpm -r
## Progress Log

- [2026-11-13] Created
- [2026-11-22] Started
- [2026-11-22] criterion 1 — evidence: RPT-031 repro in a temp repo, node plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets → exit 1, reports 'github token — config.ts:1' and 'github token — classic.ts:1' (2026-11-22)
- [2026-11-22] criterion 2 — evidence: pnpm vitest run src/commands/scan-secrets.test.ts → 25 passed; new github_pat_ test failed before the fix, classic test covers all five gh*_ prefixes (2026-11-22)
- [2026-11-22] criterion 3 — evidence: pnpm --filter dev-workflow build → plugins/dev-workflow/dist/commands/scan-secrets.js regenerated and staged with src (2026-11-22)
- [2026-11-22] Completed