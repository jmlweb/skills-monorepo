---
id: TSK-059
title: Fix: detect-test-runner picks a farther lockfile over the nearest one and never detects npm
status: pending
priority: P3
tags: []
created: 2026-10-20
source: report/RPT-011
depends-on: []
---

# Fix: detect-test-runner picks a farther lockfile over the nearest one and never detects npm

## Description

### Context

From RPT-011. `detectPackageManager` (`plugins/dev-workflow/src/commands/detect-test-runner.ts:33-39`) checks lockfile names in fixed order, each against all ancestors via `existsInAncestors` (`:132-140`). A farther `pnpm-lock.yaml` wins over a nearer `yarn.lock`, and `package-lock.json` is never checked, so `detect-test-runner` emits wrong commands for nested projects.

### Approach

Walk ancestors once from the package dir upward; at each level check `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`; return on the first hit; default `npm`. Make the `detectRunnerInDir` test hermetic by asserting against a fixture with a parent lockfile it controls.

## Acceptance Criteria

- [ ] detectPackageManager returns the package manager of the nearest directory holding any lockfile
- [ ] package-lock.json is detected as npm
- [ ] A yarn.lock or package-lock.json in the package dir beats a pnpm-lock.yaml in an ancestor (regression test)
- [ ] detect-test-runner.test.ts passes when an ancestor of the fixture holds a stray pnpm-lock.yaml
- [ ] dist rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-10-20] Created