---
id: TSK-057
title: Optional GitHub Issues backend for tasks, ideas and reports
status: blocked
priority: P2
tags: []
created: 2026-10-19
source: idea/PLN-027
depends-on: []
started: 2026-10-22
blocked-by: Phase 1 (criteria 1, 2, 4) landed on hustle/maintainer/task-2026-10-22. Phase 2 remains: criteria 3, 5-11 need the gh wrapper, GithubStore, resolveStore backend selection, setup --github, GitHub-mode compress/condense/stats/doctor/hook, stub-gh contract tests and docs. Too large for one unattended run; split Phase 2 into its own task.
---

# Optional GitHub Issues backend for tasks, ideas and reports

## Description

Let a project keep its tasks, ideas and reports in GitHub Issues instead of `.backlog/` files, as an opt-in backend. File mode stays the default. Learnings stay local for v1.

Approach: Phase 1 introduces a BacklogStore seam (FileStore extraction, commands take a store, skills call the CLI instead of reading directories). Phase 2 adds the gh wrapper, GithubStore, backend selection, compress/condense support, setup --github, hook change, contract tests and docs. Consider splitting the two phases into separate tasks. Audit all skills for direct {{BACKLOG}} reads (check-task, block-task, log-progress, retro, condense-tasks, kickstart) and add report-list explicitly. Full plan: .backlog/ideas/complete/PLN-027-optional-github-issues-backend-for.md

## Acceptance Criteria

- [x] BacklogStore interface defined and FileStore extracted with no behaviour change
- [x] Task, idea and report commands take a store; learnings keep file access
- [ ] resolveStore() selects backend via FLOWSTATE_BACKEND and FLOWSTATE_GITHUB_REPO
- [x] Every skill directory read has a CLI equivalent (incl. report-list) and skills call the CLI
- [ ] gh execFile wrapper with typed GhMissingError, GhAuthError, GhRepoError
- [ ] GithubStore maps type, status, priority and metadata block; strict final-state label validation
- [ ] task-compress and task-condense work in GitHub mode or skip with explicit message
- [ ] setup --github verifies auth, creates labels and prints settings snippet
- [ ] index-rebuild, stats, task-doctor, path and pre-commit hook handle GitHub mode
- [ ] Contract tests run against both backends using a stub gh; opt-in sandbox script for a real repo
- [ ] Docs updated: architecture.md, README, GLOSSARY.md, setup and guide skills; dist rebuilt

## Notes

## Learnings

- LRN-040: A blocked task can sit in tasks/pending, so status does not say where a task lives
## Progress Log

- [2026-10-19] Created
- [2026-10-22] Started
- [2026-10-22] criterion 1 — evidence: pnpm vitest run src/core/store.contract.test.ts → 10 passed against FileStore; full suite 314 baseline tests unchanged and green (331 total) (2026-10-22)
- [2026-10-22] criterion 2 — evidence: pnpm typecheck → 0 errors with every task/idea/report command taking BacklogStore; learning commands still take root; pnpm vitest run → 331 passed (2026-10-22)
- [2026-10-22] criterion 4 — evidence: pnpm vitest run src/plugin.test.ts src/commands/report-list.test.ts → 7 passed; the skills test flags 20 folder-read lines in the HEAD~1 skills and 0 now; pnpm lint:skills → 0 errors (2026-10-22)
- [2026-10-22] Blocked: Phase 1 (criteria 1, 2, 4) landed on hustle/maintainer/task-2026-10-22. Phase 2 remains: criteria 3, 5-11 need the gh wrapper, GithubStore, resolveStore backend selection, setup --github, GitHub-mode compress/condense/stats/doctor/hook, stub-gh contract tests and docs. Too large for one unattended run; split Phase 2 into its own task.