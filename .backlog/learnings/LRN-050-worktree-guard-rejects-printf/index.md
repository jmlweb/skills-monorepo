---
id: LRN-050
title: Worktree guard rejects printf -- pipelines, not only git
status: active
tags: [worktree, tooling, shell, isolation-guard]
task: TSK-067
created: 2026-11-07
---

## Context
TSK-067 repro `printf -- '- item…' | node …/atlassian-polish.js md-to-adf` run inside an `isolation: worktree` subagent (2026-11-07).

## Insight
The isolation guard refuses any command it cannot prove is not git; a `printf --` with a leading-dash payload piped into node trips it even though no git is involved.

## Application
Feed CLI repros through a quoted heredoc attached to the `node` command (`node …/atlassian-polish.js md-to-adf <<'MD'`). That also matches the `Bash(node:*)` allow rule skills rely on (LRN-031).
