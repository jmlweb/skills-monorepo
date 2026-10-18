---
id: LRN-038
title: The Bash tool runs zsh: no word-splitting, nomatch globs abort, a leading = is a command lookup
status: active
tags: [shell, zsh, tooling, skills, flowstate]
task: 
created: 2026-10-18
---

## Context
Transcript mining on 2026-10-18 across about 50 sessions. Fix commit 3cf6e73 counted about 40 failures of one pattern in flowstate 2.6.2-2.15.0 transcripts.

## Insight
- `F="node /…/flowstate.js"; $F task-list` fails with `no such file or directory: node /…`: zsh does not split an unquoted variable into words. `git add $FILES` fails the same way with one long pathspec.
- An unquoted glob with no match aborts the whole command (`no matches found: --include=*.md`, or a guessed `.backlog/tasks/active/TSK-041-*.md`).
- A word starting with `=` is expanded as a command path: `echo ===` fails with `=== not found`.
CI runs bash, so none of this shows in CI; only in agent sessions on macOS.

## Application
Store one path per variable and run `node "$F"`; list several files inline. Quote glob arguments to tools (`--include='*.md'`). Use `'---'` as an output separator. Find entity files through the flowstate CLI, not guessed status dirs. Skill templates write the full `node "${CLAUDE_PLUGIN_ROOT}/…"` command (docs/writing-skills.md, Shell values).
