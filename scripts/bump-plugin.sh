#!/usr/bin/env bash
set -euo pipefail

# Uso: scripts/bump-plugin.sh <plugin-name> <patch|minor|major|x.y.z>
# Actualiza la version en:
#   plugins/<plugin>/package.json
#   plugins/<plugin>/.claude-plugin/plugin.json
#   plugins/<plugin>/SKILL.md      (solo si existe)
#   .claude-plugin/marketplace.json (via scripts/version-sync.js)

PLUGIN="${1:?Usage: bump-plugin.sh <plugin-name> <patch|minor|major|x.y.z>}"
ARG="${2:?Usage: bump-plugin.sh <plugin-name> <patch|minor|major|x.y.z>}"

MONO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_ROOT="$MONO_ROOT/plugins/$PLUGIN"

if [ ! -d "$PLUGIN_ROOT" ]; then
  echo "Plugin directory not found: $PLUGIN_ROOT" >&2
  exit 1
fi

cd "$PLUGIN_ROOT"
npm version "$ARG" --no-git-tag-version >/dev/null
VERSION=$(node -p "require('./package.json').version")

PLUGIN_JSON="$PLUGIN_ROOT/.claude-plugin/plugin.json"
TMP=$(mktemp)
jq --arg v "$VERSION" '.version = $v' "$PLUGIN_JSON" > "$TMP" && mv "$TMP" "$PLUGIN_JSON"

UPDATED=("package.json" ".claude-plugin/plugin.json")

SKILL="$PLUGIN_ROOT/SKILL.md"
if [ -f "$SKILL" ]; then
  sed -i.bak "s|^version: .*|version: $VERSION|" "$SKILL" && rm "$SKILL.bak"
  UPDATED+=("SKILL.md")
fi

node "$MONO_ROOT/scripts/version-sync.js"
UPDATED+=(".claude-plugin/marketplace.json (root)")

echo "Bumped $PLUGIN to $VERSION"
for file in "${UPDATED[@]}"; do
  echo "  - $file"
done
echo ""
echo "To release:"
echo "  git add -A && git commit -m \"chore: release $PLUGIN v$VERSION\""
echo "  git tag plugins/$PLUGIN/v$VERSION"
echo "  git push && git push --tags"
