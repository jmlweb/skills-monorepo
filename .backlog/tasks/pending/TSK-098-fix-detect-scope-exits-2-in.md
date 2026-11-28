---
id: TSK-098
title: Fix: detect-scope exits 2 in a repository with no commits yet
status: pending
priority: P3
tags: []
created: 2026-11-28
source: report/RPT-043
depends-on: []
---

# Fix: detect-scope exits 2 in a repository with no commits yet

## Description

`plugins/dev-workflow/src/core/git.ts:86-88` uses `git rev-parse --abbrev-ref HEAD`, which fails before the first commit. Use `git symbolic-ref --short -q HEAD` (empty on detached HEAD) or handle the unborn case. See RPT-043 for the reproduction.

## Acceptance Criteria

- [ ] getCurrentBranch returns the branch name on an unborn branch instead of throwing
- [ ] detect-scope exits 0 with staged files in a repo with no commits
- [ ] Test covers the unborn-branch case with a real temp repo
- [ ] Detached HEAD still yields an empty branch
- [ ] dist/ rebuilt and committed

## Notes

## Learnings

## Progress Log

- [2026-11-28] Created