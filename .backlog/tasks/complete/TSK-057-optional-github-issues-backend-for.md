---
id: TSK-057
title: Optional GitHub Issues backend for tasks, ideas and reports
status: complete
priority: P2
tags: [flowstate, store, github]
created: 2026-10-19
source: idea/PLN-027
depends-on: []
started: 2026-10-22
completed: 2026-11-07
condensed: true
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
- LRN-041: task-block leaves tasks/index.md stale, which fails pnpm backlog:check in CI
## Progress Log

- [2026-10-19] Created
- [2026-11-07] Completed
- [2026-11-07] Condensed
- [2026-11-07] Split: phase 1 merged in 53a52a4 (#10), scope done. Criteria 3 and 5-11 moved to TSK-081, approved by the user 2026-11-07. Phase 1 evidence (criteria 1, 2, 4): store.contract.test.ts 10 passed, typecheck 0 errors, plugin.test.ts and report-list.test.ts 7 passed, all on 2026-10-22
