---
id: TSK-086
title: Fix: scan-secrets misses fine-grained GitHub tokens (github_pat_)
status: pending
priority: P3
tags: [dev-workflow, scan-secrets, security]
created: 2026-11-13
source: report/RPT-031
depends-on: []
---

# Fix: scan-secrets misses fine-grained GitHub tokens (github_pat_)

## Description

Source: RPT-031. The only GitHub pattern in `plugins/dev-workflow/src/commands/scan-secrets.ts:42` is `gh[pousr]_`, so fine-grained PATs (`github_pat_…`) pass the pre-commit scan. Add a pattern for them. Reproduction in RPT-031.

## Acceptance Criteria

- [ ] scan-secrets reports a staged github_pat_ token as a GitHub token with file and line
- [ ] scan-secrets.test.ts covers a fine-grained token and still covers the classic gh*_ prefixes
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-13] Created