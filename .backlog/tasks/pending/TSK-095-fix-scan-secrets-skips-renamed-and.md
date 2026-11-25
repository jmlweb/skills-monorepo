---
id: TSK-095
title: Fix: scan-secrets skips renamed and copied files, so a rename to .env or a secret added to a moved file passes
status: pending
priority: P2
tags: [dev-workflow, scan-secrets, security]
created: 2026-11-25
source: report/RPT-040
depends-on: []
---

# Fix: scan-secrets skips renamed and copied files, so a rename to .env or a secret added to a moved file passes

## Description

`--diff-filter=AM` in `plugins/dev-workflow/src/core/git.ts:35,47,66,80` drops git's `R`/`C` statuses. Because of that, renamed and copied files skip both the filename check and the content check. See RPT-040 for the repro. Include renames and copies in the filter (e.g. `ACMR`, or `--no-renames`) and keep the `+++ b/<path>` header parsing intact.

## Acceptance Criteria

- [ ] scan-secrets flags a staged rename to .env as a sensitive filename
- [ ] scan-secrets flags a secret added to a renamed or copied file, for staged changes and --range
- [ ] detect-scope and detect-packages include renamed files
- [ ] Tests cover rename and copy cases with a real temp git repo

## Notes

## Learnings

## Progress Log

- [2026-11-25] Created