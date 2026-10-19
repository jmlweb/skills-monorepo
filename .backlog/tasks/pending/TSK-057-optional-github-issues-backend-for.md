---
id: TSK-057
title: Optional GitHub Issues backend for tasks, ideas and reports
status: pending
priority: P2
tags: []
created: 2026-10-19
source: idea/PLN-027
depends-on: []
---

# Optional GitHub Issues backend for tasks, ideas and reports

## Description

Let a project keep its tasks, ideas and reports in GitHub Issues instead of `.backlog/` files, as an opt-in backend. File mode stays the default. Learnings stay local for v1.

Approach: Phase 1 introduces a BacklogStore seam (FileStore extraction, commands take a store, skills call the CLI instead of reading directories). Phase 2 adds the gh wrapper, GithubStore, backend selection, compress/condense support, setup --github, hook change, contract tests and docs. Consider splitting the two phases into separate tasks. Audit all skills for direct {{BACKLOG}} reads (check-task, block-task, log-progress, retro, condense-tasks, kickstart) and add report-list explicitly. Full plan: .backlog/ideas/complete/PLN-027-optional-github-issues-backend-for.md

## Acceptance Criteria

- [ ] BacklogStore interface defined and FileStore extracted with no behaviour change
- [ ] Task, idea and report commands take a store; learnings keep file access
- [ ] resolveStore() selects backend via FLOWSTATE_BACKEND and FLOWSTATE_GITHUB_REPO
- [ ] Every skill directory read has a CLI equivalent (incl. report-list) and skills call the CLI
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

- [2026-10-19] Created