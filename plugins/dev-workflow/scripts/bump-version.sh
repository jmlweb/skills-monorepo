#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/bump-version.sh <patch|minor|major|x.y.z>
# Updates version in package.json, .claude-plugin/plugin.json, and marketplace.json

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARG="${1:?Usage: bump-version.sh <patch|minor|major|x.y.z>}"

cd "$ROOT"
npm version "$ARG" --no-git-tag-version >/dev/null

VERSION=$(node -p "require('./package.json').version")

PLUGIN="$ROOT/.claude-plugin/plugin.json"
TMP=$(mktemp)
jq --arg v "$VERSION" '.version = $v' "$PLUGIN" > "$TMP" && mv "$TMP" "$PLUGIN"

MONO_ROOT="$(cd "$ROOT/../.." && pwd)"
node "$MONO_ROOT/scripts/version-sync.js"

echo "Bumped to $VERSION"
echo "  - package.json"
echo "  - .claude-plugin/plugin.json"
echo "  - .claude-plugin/marketplace.json"
echo ""
echo "To release:"
echo "  git add -A && git commit -m \"chore: release dev-workflow v$VERSION\""
echo "  git tag plugins/dev-workflow/v$VERSION"
echo "  git push && git push --tags"
