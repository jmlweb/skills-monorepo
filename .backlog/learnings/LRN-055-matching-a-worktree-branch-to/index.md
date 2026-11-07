---
id: LRN-055
title: Matching a worktree branch to a task through BASE..branch needs a merged-branch fallback
status: active
tags: [flowstate, parallel, git, resume]
task: TSK-080
created: 2026-11-07
---

## Context
`shared/parallel-resume.md` matches leftover worktrees to tasks via `TSK-` references in `git log {{BASE}}..{{BRANCH}}`. A merged branch has an empty range.

## Insight
Fall back to `git log -1 --format=%s {{BRANCH}}` for the tip subject. Treat the group start commit `chore(backlog): start ...` as no reference: a never-committed branch's tip is that commit and it names every task of the run. `git -C` is refused by the isolation guard inside subagents but runs fine in the coordinator session, so shared prose must say which session runs each command.

## Application
Any "match branch to task through commit subjects" logic needs the merged-branch fallback plus an exclusion for multi-task commits, and names the session that runs `git -C`.
