---
id: RPT-011
title: detect-test-runner picks a farther lockfile over the nearest one and never detects npm
type: bug
severity: medium
status: triaged
created: 2026-10-20
triaged: 2026-10-20
task-id: TSK-059
---

## Problem

`detectPackageManager` (`plugins/dev-workflow/src/commands/detect-test-runner.ts:33-39`) checks lockfiles in a fixed order (`pnpm-lock.yaml`, then `yarn.lock`, else `npm`). `detectRunnerInDir` (`:122-130`) feeds it `existsInAncestors` (`:132-140`), which walks every ancestor directory for each name. So a `pnpm-lock.yaml` anywhere above the package wins over a `yarn.lock` or `package-lock.json` sitting in the package directory itself. `package-lock.json` is never checked, so a nested npm project under any yarn or pnpm ancestor is always misdetected.

Effect: `detect-test-runner` emits the wrong `suiteCommand`, `testCommand` and `coverageCommand` (e.g. `pnpm exec jest` in a yarn project), which the prune-tests workflow then runs.

## Reproduction

```bash
D=$(mktemp -d /var/tmp/pmrepro.XXXX)
touch "$D/pnpm-lock.yaml"
mkdir "$D/app"
echo '{"devDependencies":{"jest":"^30.0.0"},"scripts":{"test":"jest"}}' > "$D/app/package.json"
touch "$D/app/yarn.lock"
node plugins/dev-workflow/dist/bin/dev-workflow.js detect-test-runner --cwd "$D/app" --json true
```

Observed: `"packageManager": "pnpm"`, `"testCommand": ["pnpm","exec","jest","{file}"]`. Expected: `yarn`.

Same layout with `app/package-lock.json` instead of `app/yarn.lock` also reports `pnpm`; with `yarn.lock` in the parent it reports `yarn`. Expected `npm` in both.

## Second symptom: non-hermetic test

`plugins/dev-workflow/src/commands/detect-test-runner.test.ts:57-64` creates its fixture under `os.tmpdir()` and expects `yarn`. On a machine where `/tmp/pnpm-lock.yaml` exists it fails:

```
FAIL src/commands/detect-test-runner.test.ts > detectRunnerInDir > reads package.json and lockfiles from the directory
AssertionError: expected 'pnpm' to be 'yarn'
```

Observed under `pnpm test` (turbo) even with `TMPDIR` pointed elsewhere; direct `pnpm vitest run` with that `TMPDIR` passes, which suggests turbo does not pass `TMPDIR` through (observed, not proven).

## Suggested fix

Walk ancestors once, nearest first, and return the package manager of the first directory holding any lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`). Add a test with a stray `pnpm-lock.yaml` in the fixture's parent.
