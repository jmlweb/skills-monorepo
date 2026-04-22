#!/usr/bin/env bash
# PostToolUse hook: suggest /flowstate:report when tests fail
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_output.exit_code // 0')

# Only trigger on test-like commands that failed
if [[ "$EXIT_CODE" != "0" ]] && echo "$COMMAND" | grep -qiE '(vitest|jest|pytest|cargo test|go test|npm test|pnpm test)'; then
  cat <<'EOF'
{"additionalContext": "Tests failed. Consider running /flowstate:report to document this issue if it's unexpected."}
EOF
fi
