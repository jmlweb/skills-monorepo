---
id: LRN-005
title: Settings env delivery to Bash/hooks unverified; CLAUDE_PROJECT_DIR absent in Bash
status: active
tags: [claude-code, settings, env, hooks, flowstate]
task: TSK-027
created: 2026-10-08
---

## Context
TSK-027 step 0: can settings.local.json env carry FLOWSTATE_BACKLOG_DIR to CLI and hook?
## Insight
Docs imply env reaches subprocesses but never state it for Bash/hooks. CLAUDE_PROJECT_DIR is exported to hooks only; not present in Bash tool env.
## Application
Do not rely on CLAUDE_PROJECT_DIR in the CLI. Prefer absolute paths or walk-up root; verify manually in a real session.
