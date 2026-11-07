---
id: TSK-081
title: GitHub Issues backend phase 2: GithubStore, backend selection and setup
status: complete
priority: P2
tags: [flowstate, store, github]
created: 2026-11-07
source: idea/PLN-027
depends-on: []
completed: 2026-11-07
started: 2026-11-07
---

# GitHub Issues backend phase 2: GithubStore, backend selection and setup

## Description

Phase 2 of TSK-057, split out because it is too large for one run. Phase 1 (BacklogStore seam, FileStore, CLI-only skill reads) merged in 53a52a4 (#10). Add the gh wrapper, GithubStore, backend selection, compress and condense support, setup --github, the hook change, contract tests and docs. File mode stays the default; learnings stay local. Full plan: .backlog/ideas/complete/PLN-027-optional-github-issues-backend-for.md. Settle the blocked-task model in TSK-073 first if possible (LRN-040, LRN-041): GithubStore has to map the same statuses.

## Acceptance Criteria

- [x] resolveStore() selects backend via FLOWSTATE_BACKEND and FLOWSTATE_GITHUB_REPO
- [x] gh execFile wrapper with typed GhMissingError, GhAuthError, GhRepoError
- [x] GithubStore maps type, status, priority and metadata block; strict final-state label validation — evidence: github-store.test.ts 24 tests plus store.contract.test.ts 20 tests on both backends (2026-11-07)
- [x] task-compress and task-condense work in GitHub mode or skip with explicit message
- [x] setup --github verifies auth, creates labels and prints settings snippet
- [x] index-rebuild, stats, task-doctor, path and pre-commit hook handle GitHub mode
- [x] Contract tests run against both backends using a stub gh; opt-in sandbox script for a real repo — evidence: stub gh in scripts/gh-stub.mjs; pnpm sandbox:github-backend refuses without --repo and never runs in pnpm test (2026-11-07)
- [x] Docs updated: architecture.md, README, GLOSSARY.md, setup and guide skills; dist rebuilt — evidence: architecture.md 93 lines, README GitHub mode, GLOSSARY Backend, setup and guide skills; dist clean (2026-11-07)

## Notes

## Learnings

- LRN-063: A server-assigned ID backend keeps the ID out of the stored payload and derives it on read
- LRN-064: A stub for an external CLI must mirror its global preconditions, not only the happy subcommands
- LRN-065: Wait for CI on main before pushing a release tag; CLI-spawning suites need an explicit vitest timeout
## Progress Log

- [2026-11-07] Created
- [2026-11-07] Merged cc2548c..3ef1c16 into main (f0693a5): flowstate 467 tests, scripts 161, dist clean, lint:skills 0/0, plugin validate passed. Follow-ups: import command from .backlog into GitHub Issues; live run of pnpm sandbox:github-backend --repo on a throwaway repo.
- [2026-11-07] Completed