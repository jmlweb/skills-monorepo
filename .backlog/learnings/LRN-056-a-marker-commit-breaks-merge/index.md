---
id: LRN-056
title: A marker commit breaks merge --ff-only base sync; worktree briefs rebase instead
status: active
tags: [worktree, parallel, git, flowstate]
task: TSK-080
created: 2026-11-07
---

## Context
TSK-080 made an empty marker commit (`chore: start TSK-NNN`) the first step of `shared/worktree-brief.md`, ahead of the base sync that used `git merge --ff-only {{BASE}}`.

## Insight
Once the branch holds any commit, `--ff-only` fails whenever the base moved. `git rebase {{BASE}}` on a branch holding only an empty commit cannot conflict and keeps the empty commit (git >= 2.26 default; checked with Apple git 2.50.1).

## Application
In worktree briefs the order is marker, then `git rebase {{BASE}}`, never `--ff-only` after the marker. The coordinator matches worktrees to tasks through that marker subject.
