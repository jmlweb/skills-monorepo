#!/usr/bin/env bash
# PreToolUse hook: remind about active tasks before git commit
set -euo pipefail

INPUT=$(cat)

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit commands
printf '%s' "$COMMAND" | grep -qE '\bgit[[:space:]]+commit\b' || exit 0

emit() { # $1 = "  - ID: title\n" lines
  # Titles are raw user text (quotes, backslashes); jq --arg escapes them, a heredoc did not.
  jq -n --arg tasks "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: ("Before committing — active tasks in backlog:\n" + $tasks + "Consider if this commit completes any of them (/flowstate:complete-task).")
    }
  }'
}

# GitHub mode: active tasks are issues, so the CLI lists them. The hook must stay quiet
# and quick, so any failure (no gh, no auth, no network, no backlog dir) exits 0 silently.
if [ "$(printf '%s' "${FLOWSTATE_BACKEND:-}" | tr '[:upper:]' '[:lower:]')" = "github" ]; then
  CLI="$(dirname "$0")/../dist/bin/flowstate.js"
  ACTIVE_JSON=$(node "$CLI" task-list --status active --json true 2>/dev/null) || exit 0
  TASKS=$(printf '%s' "$ACTIVE_JSON" | jq -r '.[] | "  - \(.id): \(.title)"' 2>/dev/null) || exit 0
  [ -n "$TASKS" ] || exit 0
  emit "${TASKS}"$'\n'
  exit 0
fi

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

ACTIVE_COUNT=$(find "$BACKLOG_DIR" -name '*.md' | wc -l)
[ "$ACTIVE_COUNT" -gt 0 ] || exit 0

TASKS=""
for f in "$BACKLOG_DIR"/*.md; do
  TITLE=$(grep -m1 '^title:' "$f" | sed 's/^title: *//')
  ID=$(grep -m1 '^id:' "$f" | sed 's/^id: *//')
  TASKS="${TASKS}  - ${ID}: ${TITLE}"$'\n'
done

emit "$TASKS"
