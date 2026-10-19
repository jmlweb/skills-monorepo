---
id: RPT-010
title: parallel skill leaves worktrees behind and doesn't prepare subagents for a stale base
type: improvement
severity: medium
status: triaged
created: 2026-10-18
triaged: 2026-10-19
task-id: TSK-055
---

## Description
After every flowstate:parallel run in this repo the user had to ask separately to "clean worktrees", "remove worktrees" or "delete worktrees" (sessions ebb014fd, f41aa941, 706c8a5a, 603f2983). The skill's collect step ends at "review each worktree" with no cleanup. Its subagent prompt also says nothing about the base being stale or node_modules missing, which LRN-019 (consolidated from nine learnings) shows happens on every run.

## Expected
- Subagent prompt: sync with the coordinator's HEAD and install dependencies before work, when the project has a lockfile.
- Collect step or complete-task: once a branch is merged, offer to remove its worktree and branch (`git worktree remove`, `git branch -d`, `git worktree prune`).
Machine-specific rtk and guard workarounds stay out of the published skill.
