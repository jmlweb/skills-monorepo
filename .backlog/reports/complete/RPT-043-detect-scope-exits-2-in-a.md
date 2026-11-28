---
id: RPT-043
title: detect-scope exits 2 in a repository with no commits yet
type: bug
severity: medium
status: triaged
created: 2026-11-28
triaged: 2026-11-28
task-id: TSK-098
---

## Observed

`plugins/dev-workflow/src/core/git.ts:86-88` `getCurrentBranch` runs `git rev-parse --abbrev-ref HEAD`. On an unborn branch (fresh `git init`, first commit not made yet) that command fails, `runGit` throws `GitError`, and `detect-scope` (called from `src/bin/dev-workflow.ts:95` whenever `--branch` is absent) exits 2. The commit skill (`shared/commit-basics.md:53`) runs `detect-scope --json true` for every commit, so the very first commit in a new repo hits a hard error. `scan-secrets` in the same state works fine.

## Reproduction

```bash
cd "$(mktemp -d)" && git init -q && git checkout -q -b feat/login
echo a > a && git add a
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js detect-scope; echo "exit $?"
# Error: git rev-parse --abbrev-ref HEAD failed: ... fatal: ambiguous argument 'HEAD': unknown revision ...
# exit 2
```

## Expected

Scope detection works on an unborn branch: read the branch name with `git symbolic-ref --short HEAD` (works before the first commit) or treat the unborn case as the branch name, and still suggest a scope from staged files (here `source: none`, or `branch` -> `login`).
