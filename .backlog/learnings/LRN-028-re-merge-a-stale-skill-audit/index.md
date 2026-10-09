---
id: LRN-028
title: Re-merge a stale skill audit by taking main's files and replaying edits
status: active
tags: [workflow, skills, merge, worktree]
task: TSK-033
created: 2026-10-09
---

## Context
The TSK-033 audit branched before TSK-028 (user-invoked split, plan->idea rename), so 8 SKILL.md files conflicted on merge.
## Insight
Hand-resolving markers is slower than taking main's version of conflicted skills and re-running the audit's edit script. Exact-match assertions in the script flag every string main changed.
## Application
Write audit edits as an assert-based script from the start; after a merge take main's files and replay it, adapting only changed strings.
