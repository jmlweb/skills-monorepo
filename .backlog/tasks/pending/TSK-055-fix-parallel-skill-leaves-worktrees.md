---
id: TSK-055
title: Fix: parallel skill leaves worktrees behind after merge
status: pending
priority: P3
tags: []
created: 2026-10-19
source: report/RPT-010
depends-on: []
---

# Fix: parallel skill leaves worktrees behind after merge

## Description

After every flowstate:parallel run the user had to ask separately to clean up worktrees (sessions ebb014fd, f41aa941, 706c8a5a, 603f2983). The collect step in plugins/flowstate/skills/parallel/SKILL.md ends at "review each worktree" (line 152) with no cleanup.

The subagent-prompt half of RPT-010 (sync base, install dependencies) is already done in plugins/flowstate/shared/worktree-brief.md. Only the cleanup remains.

### Expected
Collect step or complete-task: once a branch is merged, offer to remove its worktree and branch (`git worktree remove`, `git branch -d`, `git worktree prune`). Machine-specific rtk and guard workarounds stay out of the published skill.

## Acceptance Criteria

- [ ] After a branch is merged, the parallel collect step offers to remove its worktree and branch
- [ ] The offer uses git worktree remove, git branch -d and git worktree prune
- [ ] Machine-specific rtk and guard workarounds stay out of the published skill

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created