---
id: LRN-066
title: A submodule .git file also points inside the parent .git: check .git/worktrees/, not .git/
status: active
tags: [dev-workflow, hooks, read-only-zones, git]
task: TSK-082
created: 2026-11-10
---

Linked worktrees and submodules both use a `.git` file with `gitdir: <path>`. A worktree points to `<repo>/.git/worktrees/<name>`; a submodule points to `<repo>/.git/modules/<path>`. Testing "pointer is inside the project's .git" therefore classes a submodule as a worktree of the project and keeps it as its own match root. Test against `.git/worktrees/` to tell them apart without spawning git. The read-only-zones hook walks out of every nested repo under the session directory that is not a worktree, so zones stay relative to the project root.
