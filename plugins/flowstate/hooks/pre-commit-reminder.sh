#!/usr/bin/env bash
# PreToolUse hook: remind about active tasks before git commit
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit commands
echo "$COMMAND" | grep -qE '\bgit\s+commit\b' || exit 0

BACKLOG_DIR=".backlog/tasks/active"
[ -d "$BACKLOG_DIR" ] || exit 0

# Hooks run in project root, so relative path is correct
ACTIVE_COUNT=$(fd -e md . "$BACKLOG_DIR" | wc -l)
[ "$ACTIVE_COUNT" -gt 0 ] || exit 0

TASKS=""
for f in "$BACKLOG_DIR"/*.md; do
  TITLE=$(grep -m1 '^title:' "$f" | sed 's/^title: *//')
  ID=$(grep -m1 '^id:' "$f" | sed 's/^id: *//')
  TASKS="${TASKS}  - ${ID}: ${TITLE}\n"
done

cat <<EOF
{"additionalContext": "Before committing — active tasks in backlog:\n${TASKS}Consider if this commit completes any of them (/flowstate:complete-task)."}
EOF
