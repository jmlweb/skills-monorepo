---
id: LRN-021
title: Worktree guard rejects compound or variable-driven Bash commands
status: active
tags: [worktree, tooling, parallel]
task: TSK-047
created: 2026-10-08
---

## Context
The TSK-047 worktree agent had Bash calls rejected with "cannot be shown not to be git".

## Insight
Commands using shell variables, globs, grep alternations or heredocs chained with other commands trip the guard. Literal absolute paths, one command per call, run fine. BSD sed needs `-i ''`.

## Application
In worktree agents, create files with Write or Edit and keep each Bash call to one plain command.
