#!/usr/bin/env bash
# PreToolUse hook: remind about active tasks before git commit
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit commands
echo "$COMMAND" | grep -qE '\bgit[[:space:]]+commit\b' || exit 0

# Same resolution rule as the CLI (src/core/paths.ts): FLOWSTATE_BACKLOG_DIR
# (absolute, or relative to the project root), else the nearest .backlog/ walking
# up. CLAUDE_PROJECT_DIR is deliberately not used: Bash tool calls don't get it.
find_up() { # $1 = marker names (space separated)
  local dir="$PWD" marker
  while :; do
    for marker in $1; do
      [ -e "$dir/$marker" ] && { echo "$dir"; return 0; }
    done
    [ "$dir" = "/" ] && return 1
    dir=$(dirname "$dir")
  done
}

if [ -n "${FLOWSTATE_BACKLOG_DIR:-}" ]; then
  case "$FLOWSTATE_BACKLOG_DIR" in
    /*) ROOT_DIR="$FLOWSTATE_BACKLOG_DIR" ;;
    *) ROOT_DIR="$(find_up '.git .backlog' || echo "$PWD")/$FLOWSTATE_BACKLOG_DIR" ;;
  esac
else
  PROJECT=$(find_up '.backlog') || exit 0
  ROOT_DIR="$PROJECT/.backlog"
fi

BACKLOG_DIR="$ROOT_DIR/tasks/active"
[ -d "$BACKLOG_DIR" ] || exit 0

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
