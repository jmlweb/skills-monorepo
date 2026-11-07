---
id: TSK-081
title: GitHub Issues backend phase 2: GithubStore, backend selection and setup
status: pending
priority: P2
tags: [flowstate, store, github]
created: 2026-11-07
source: idea/PLN-027
depends-on: []
---

# GitHub Issues backend phase 2: GithubStore, backend selection and setup

## Description

Phase 2 of TSK-057, split out because it is too large for one run. Phase 1 (BacklogStore seam, FileStore, CLI-only skill reads) merged in 53a52a4 (#10). Add the gh wrapper, GithubStore, backend selection, compress and condense support, setup --github, the hook change, contract tests and docs. File mode stays the default; learnings stay local. Full plan: .backlog/ideas/complete/PLN-027-optional-github-issues-backend-for.md. Settle the blocked-task model in TSK-073 first if possible (LRN-040, LRN-041): GithubStore has to map the same statuses.

## Acceptance Criteria

- [ ] resolveStore() selects backend via FLOWSTATE_BACKEND and FLOWSTATE_GITHUB_REPO
- [ ] gh execFile wrapper with typed GhMissingError, GhAuthError, GhRepoError
- [ ] GithubStore maps type, status, priority and metadata block; strict final-state label validation
- [ ] task-compress and task-condense work in GitHub mode or skip with explicit message
- [ ] setup --github verifies auth, creates labels and prints settings snippet
- [ ] index-rebuild, stats, task-doctor, path and pre-commit hook handle GitHub mode
- [ ] Contract tests run against both backends using a stub gh; opt-in sandbox script for a real repo
- [ ] Docs updated: architecture.md, README, GLOSSARY.md, setup and guide skills; dist rebuilt

## Notes

## Learnings

## Progress Log

- [2026-11-07] Created