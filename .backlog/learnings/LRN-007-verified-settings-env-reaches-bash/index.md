---
id: LRN-007
title: Verified: settings env reaches Bash and hooks; CLAUDE_PROJECT_DIR is hook-only
status: active
tags: [claude-code, settings, env, hooks, flowstate]
task: TSK-027
created: 2026-10-08
---

## Context
TSK-027 step 0 was unverified (LRN-005). Probed with a nested `claude -p` in a scratch dir whose `.claude/settings.local.json` had `env.FLOWSTATE_BACKLOG_DIR` and a SessionStart hook.
## Insight
Settings `env` is visible to both a SessionStart hook and a Bash tool call. `CLAUDE_PROJECT_DIR` is set for hooks but unset in Bash. Supersedes the "unverified" part of LRN-005.
## Application
Safe to deliver FLOWSTATE_BACKLOG_DIR via settings.local.json. Never rely on CLAUDE_PROJECT_DIR in CLI code. Probe recipe: `claude -p "<prompt>" --allowedTools "Bash" < /dev/null` (put the prompt before the variadic flag).
