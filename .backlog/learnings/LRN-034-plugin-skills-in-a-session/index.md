---
id: LRN-034
title: Plugin skills in a session load from the plugin cache, not from plugins/
status: active
tags: [claude-code, plugins, testing]
task: TSK-050
created: 2026-10-15
---

## Context
Live tests of a skill used the installed copy (~/.claude/plugins/cache/), so edits to plugins/dev-workflow/ had no effect until the plugin was reinstalled.

## Insight
`claude --plugin-dir <path>` loads the source copy for that session. Without it, the cached version wins, and skill text changes look ignored.

## Application
Test skill edits with `claude --plugin-dir plugins/<name>` after `pnpm build`. The sandbox harness `pnpm sandbox:prune-tests` does this for prune-tests.
