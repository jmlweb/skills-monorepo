---
id: LRN-054
title: Worktree isolation guard inspects command text: any payload mentioning git is refused
status: active
tags: [tooling, worktree, agents, isolation-guard]
task: TSK-071
created: 2026-11-07
---

## Context
Hook tests in an `isolation: worktree` subagent piped a JSON payload holding `"git commit"` into a hook script and were refused as "cannot be shown not to be git"; a `python3` heredoc patch script was refused the same way (TSK-070/071, 2026-11-07).

## Insight
The guard inspects the whole command text, not only the executable. Fixtures, stdin payloads and patch scripts that mention git trip it even when nothing runs git. Extends LRN-019 and LRN-050.

## Application
In a worktree agent, write fixtures and stdin payloads with `Write` to a scratchpad file, then run one plain command with `< file`. Patch files with `Edit`, never with inline interpreter heredocs.
