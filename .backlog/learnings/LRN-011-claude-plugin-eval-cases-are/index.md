---
id: LRN-011
title: claude plugin eval cases are prompt.md plus graders, not case.yaml
status: active
tags: [evals, claude-code, routing]
task: TSK-039
created: 2026-10-08
---

## Context
TSK-039 specified case.yaml cases with a tool_used: Skill grader.
## Insight
A case is a dir with `prompt.md` (frontmatter name, tags, plugins, runs, max_turns, timeout_seconds) and `graders/<n>.md` (type: tool_used, tool: Skill, input_match, min, max). case.yaml is optional (scaffold settings). Skill-fired idiom: `input_match: '"skill"\s*:\s*"flowstate:<skill>"'`; must-not-fire is `min: 0, max: 0`. Scaffold with `claude plugin eval init --bare x`.
## Application
Author tier-2 routing cases in this form. The worktree sandbox refuses commands containing the word "eval"; run them from a script file.
