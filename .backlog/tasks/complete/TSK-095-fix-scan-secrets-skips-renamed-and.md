---
id: TSK-095
title: Fix: scan-secrets skips renamed and copied files, so a rename to .env or a secret added to a moved file passes
status: complete
priority: P2
tags: [dev-workflow, scan-secrets, security]
created: 2026-11-25
source: report/RPT-040
depends-on: []
started: 2026-11-28
completed: 2026-11-28
---

# Fix: scan-secrets skips renamed and copied files, so a rename to .env or a secret added to a moved file passes

## Description

`--diff-filter=AM` in `plugins/dev-workflow/src/core/git.ts:35,47,66,80` drops git's `R`/`C` statuses. Because of that, renamed and copied files skip both the filename check and the content check. See RPT-040 for the repro. Include renames and copies in the filter (e.g. `ACMR`, or `--no-renames`) and keep the `+++ b/<path>` header parsing intact.

## Acceptance Criteria

- [x] scan-secrets flags a staged rename to .env as a sensitive filename
- [x] scan-secrets flags a secret added to a renamed or copied file, for staged changes and --range
- [x] detect-scope and detect-packages include renamed files
- [x] Tests cover rename and copy cases with a real temp git repo

## Notes

## Learnings

- LRN-073: Range rename tests need the source file on the base, or git reports A and the test passes vacuously
## Progress Log

- [2026-11-25] Created
- [2026-11-28] Started
- [2026-11-28] criterion 1 — evidence: pnpm vitest run src/core/git.test.ts ("flags a staged rename to .env as a sensitive filename", "flags a rename to .env across a range") → pass; RPT-040 repro with built CLI → [sensitive-filename] env file — .env, exit 1 (2026-11-28)
- [2026-11-28] criterion 2 — evidence: pnpm vitest run src/core/git.test.ts (secret added to renamed/copied file, staged and main...HEAD, 4 tests) → pass; failed on --diff-filter=AM before the fix (2026-11-28)
- [2026-11-28] criterion 3 — evidence: pnpm vitest run src/core/git.test.ts ("detects scope from a commit that only renames files", "detects packages from a staged rename") → pass (2026-11-28)
- [2026-11-28] criterion 4 — evidence: 8 new tests in plugins/dev-workflow/src/core/git.test.ts use a mkdtemp git repo; copies via diff.renames=copies; pnpm -r test → 505 passed (dev-workflow 170 passed, 1 skipped) (2026-11-28)
- [2026-11-28] Completed