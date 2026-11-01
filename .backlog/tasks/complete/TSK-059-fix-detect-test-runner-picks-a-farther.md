---
id: TSK-059
title: Fix: detect-test-runner picks a farther lockfile over the nearest one and never detects npm
status: complete
priority: P3
tags: []
created: 2026-10-20
source: report/RPT-011
depends-on: []
started: 2026-11-01
completed: 2026-11-01
---

# Fix: detect-test-runner picks a farther lockfile over the nearest one and never detects npm

## Description

### Context

From RPT-011. `detectPackageManager` (`plugins/dev-workflow/src/commands/detect-test-runner.ts:33-39`) checks lockfile names in fixed order, each against all ancestors via `existsInAncestors` (`:132-140`). A farther `pnpm-lock.yaml` wins over a nearer `yarn.lock`, and `package-lock.json` is never checked, so `detect-test-runner` emits wrong commands for nested projects.

### Approach

Walk ancestors once from the package dir upward; at each level check `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`; return on the first hit; default `npm`. Make the `detectRunnerInDir` test hermetic by asserting against a fixture with a parent lockfile it controls.

## Acceptance Criteria

- [x] detectPackageManager returns the package manager of the nearest directory holding any lockfile
- [x] package-lock.json is detected as npm
- [x] A yarn.lock or package-lock.json in the package dir beats a pnpm-lock.yaml in an ancestor (regression test)
- [x] detect-test-runner.test.ts passes when an ancestor of the fixture holds a stray pnpm-lock.yaml
- [x] dist rebuilt and committed

## Notes

## Learnings

- LRN-047: Package-manager detection must walk ancestors once, not per lockfile
## Progress Log

- [2026-10-20] Created
- [2026-11-01] Started
- [2026-11-01] criterion 1 — evidence: pnpm vitest run src/commands/detect-test-runner.test.ts (detectPackageManager 'returns the manager of the nearest level holding any lockfile') → 14 passed (2026-11-01)
- [2026-11-01] criterion 2 — evidence: pnpm vitest run src/commands/detect-test-runner.test.ts ('detects package-lock.json as npm') → passed (2026-11-01)
- [2026-11-01] criterion 3 — evidence: detectRunnerInDir tests 'yarn.lock / package-lock.json in the package dir beat a pnpm-lock.yaml in an ancestor' fail on the old code, pass on the new (2026-11-01)
- [2026-11-01] criterion 4 — evidence: TMPDIR=<dir with stray pnpm-lock.yaml> pnpm vitest run src/commands/detect-test-runner.test.ts → 14 passed (old code: 7 failed) (2026-11-01)
- [2026-11-01] criterion 5 — evidence: pnpm build regenerated plugins/dev-workflow/dist/commands/detect-test-runner.{js,d.ts}; full pnpm test green (2026-11-01)
- [2026-11-01] Completed