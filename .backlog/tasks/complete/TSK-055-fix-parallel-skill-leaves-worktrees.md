---
id: TSK-055
title: Fix: parallel skill leaves worktrees behind after merge
status: complete
priority: P3
tags: []
created: 2026-10-19
source: report/RPT-010
depends-on: []
started: 2026-10-26
completed: 2026-10-26
---

# Fix: parallel skill leaves worktrees behind after merge

## Description

After every flowstate:parallel run the user had to ask separately to clean up worktrees (sessions ebb014fd, f41aa941, 706c8a5a, 603f2983). The collect step in plugins/flowstate/skills/parallel/SKILL.md ends at "review each worktree" (line 152) with no cleanup.

The subagent-prompt half of RPT-010 (sync base, install dependencies) is already done in plugins/flowstate/shared/worktree-brief.md. Only the cleanup remains.

### Expected
Collect step or complete-task: once a branch is merged, offer to remove its worktree and branch (`git worktree remove`, `git branch -d`, `git worktree prune`). Machine-specific rtk and guard workarounds stay out of the published skill.

## Acceptance Criteria

- [x] After a branch is merged, the parallel collect step offers to remove its worktree and branch
- [x] The offer uses git worktree remove, git branch -d and git worktree prune
- [x] Machine-specific rtk and guard workarounds stay out of the published skill

## Notes

## Learnings

- LRN-045: parallel SKILL.md body sits at the 150-line lint ceiling
## Progress Log

- [2026-10-19] Created
- [2026-10-26] Started
- [2026-10-26] criterion 1 — evidence: pnpm vitest run src/plugin.test.ts (parallel skill: offers to remove each merged worktree and its branch) → failed before the SKILL.md edit, passes after (2026-10-26)
- [2026-10-26] criterion 2 — evidence: same test asserts git worktree remove, git branch -d and git worktree prune in step 7 → 4/4 passed; pnpm test → exit 0 (2026-10-26)
- [2026-10-26] criterion 3 — evidence: plugin.test.ts asserts parallel SKILL.md has no rtk, guard or /usr/bin/git → passed; node scripts/lint-skills.mjs → 0 errors, 0 warnings (2026-10-26)
- [2026-10-26] Completed