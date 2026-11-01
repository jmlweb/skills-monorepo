---
id: RPT-023
title: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote
type: bug
severity: low
status: triaged
created: 2026-11-01
triaged: 2026-11-01
task-id: TSK-071
---

## Summary
`plugins/flowstate/hooks/pre-commit-reminder.sh:59-61` copies each active task's `title:` line verbatim into `TASKS`, and lines 64-66 interpolate it into a JSON string with a heredoc. A `"` or `\` in a title is not escaped, so the hook prints invalid JSON and the active-task reminder before `git commit` is lost. The CLI writes titles raw (`plugins/flowstate/src/core/frontmatter.ts:60-67`), so `task-create --title 'Handle "draft" PRs'` is enough to trigger it.

Distinct from TSK-060 (pipe/newline in titles corrupting frontmatter and index tables) and from RPT-022 (hook event and output shape).

## Reproduction
```
D=$(mktemp -d) && cd $D && git init -q
node <flowstate>/dist/bin/flowstate.js setup
node <flowstate>/dist/bin/flowstate.js task-create --title 'Handle "draft" PRs' --priority P3
node <flowstate>/dist/bin/flowstate.js task-move TSK-001 --to active
echo '{"tool_input":{"command":"git commit -m x"}}' | <repo>/plugins/flowstate/hooks/pre-commit-reminder.sh | jq .
# jq: parse error: Invalid numeric literal at line 1, column 98
```

## Suggested fix
Build the output with `jq -n --arg ctx "$TEXT" '{...}'` (jq is already a hook prerequisite) instead of interpolating into a heredoc, so any title text is escaped. Add a script test with a quoted title.
