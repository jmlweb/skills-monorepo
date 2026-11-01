---
id: RPT-022
title: on-test-failure hook never fires: wrong event and nonexistent exit_code field
type: bug
severity: medium
status: triaged
created: 2026-11-01
triaged: 2026-11-01
task-id: TSK-070
---

## Summary
The README promises (`plugins/flowstate/README.md:241`): "A test command (`vitest`, `jest`, `pytest`, `pnpm test`…) fails → Claude is nudged to consider `/flowstate:report`". The hook behind it cannot fire.

- `plugins/flowstate/hooks/hooks.json:3-13` registers `on-test-failure.sh` under `PostToolUse`. Per the Claude Code hooks reference (https://code.claude.com/docs/en/hooks), PostToolUse "Runs immediately after a tool completes successfully"; a Bash command that exits non-zero fires `PostToolUseFailure`, whose input carries `error: "Exit code N\n..."` and no `tool_response`.
- `plugins/flowstate/hooks/on-test-failure.sh:8` reads `.tool_output.exit_code // 0`. No hook input has a `tool_output` field (PostToolUse has `tool_response`, and Bash's response has no exit code), so `EXIT_CODE` is always `0` and the condition at line 11 is always false.
- Both hooks print `{"additionalContext": ...}` at the top level (`on-test-failure.sh:13`, `pre-commit-reminder.sh:65`). The same reference says to "Return `additionalContext` inside `hookSpecificOutput` alongside the event name" (`hookEventName`).

## Reproduction
A PostToolUse payload in the documented shape for a failed test run produces no output:
```
echo '{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"pnpm test"},"tool_response":{"stdout":"","stderr":"FAIL","interrupted":false}}' \
  | plugins/flowstate/hooks/on-test-failure.sh; echo "exit $?"
# (no output)
# exit 0
```
Any input lacking `tool_output.exit_code` behaves the same, and no real input carries that field.

## Suggested fix
Register the script under `PostToolUseFailure` (matcher `Bash`), detect failure from the `error` field's leading `Exit code N` line, and emit `{"hookSpecificOutput":{"hookEventName":"PostToolUseFailure","additionalContext":"..."}}`. Switch `pre-commit-reminder.sh` to the `hookSpecificOutput` shape with `hookEventName: "PreToolUse"`. Add a script test feeding documented payloads to both hooks.
