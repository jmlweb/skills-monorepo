#!/usr/bin/env bash
# PostToolUseFailure hook: suggest /flowstate:report when a test command fails.
# PostToolUse only fires on success, so a failed Bash call never reached the old
# version of this hook. The failure payload carries no exit_code field: the docs
# say to key on tool_name, is_interrupt and the `Exit code N` first line of `error`.
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')
[ "$TOOL_NAME" = "Bash" ] || exit 0

IS_INTERRUPT=$(printf '%s' "$INPUT" | jq -r '.is_interrupt // false')
[ "$IS_INTERRUPT" = "false" ] || exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
printf '%s' "$COMMAND" | grep -qiE '(vitest|jest|pytest|cargo test|go test|npm test|pnpm test)' || exit 0

# A bare failure message without an exit-code line means the shell never started.
EXIT_CODE=$(printf '%s' "$INPUT" | jq -r '.error // empty' | sed -n '1s/^Exit code \([0-9][0-9]*\).*/\1/p')
[ -n "$EXIT_CODE" ] && [ "$EXIT_CODE" != "0" ] || exit 0

jq -n '{
  hookSpecificOutput: {
    hookEventName: "PostToolUseFailure",
    additionalContext: "Tests failed. Consider running /flowstate:report to document this issue if it'"'"'s unexpected."
  }
}'
