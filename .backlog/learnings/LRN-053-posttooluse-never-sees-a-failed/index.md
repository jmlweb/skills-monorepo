---
id: LRN-053
title: PostToolUse never sees a failed Bash call; key PostToolUseFailure on the Exit code N line of error
status: active
tags: [flowstate, hooks, claude-code]
task: TSK-070
created: 2026-11-07
---

## Context
`on-test-failure.sh` was registered on `PostToolUse` and read `.tool_output.exit_code`, a field no payload has, so the nudge never fired (RPT-022, TSK-070).

## Insight
Claude Code splits tool outcomes across events: `PostToolUse` fires on success only, `PostToolUseFailure` on failure. The failure payload has no exit-code field. The official hooks docs say to key on `tool_name`, `is_interrupt` and the `Exit code N` first line of `error`, and warn that a bare message without that line means the shell never started.

## Application
Any "react to a failing command" hook goes on `PostToolUseFailure` with matcher `Bash` and parses `error` line 1 with `sed -n '1s/^Exit code \([0-9]*\).*/\1/p'`. Output goes in `hookSpecificOutput` with `hookEventName`. `scripts/flowstate-hooks.test.mjs` holds the documented payloads.
