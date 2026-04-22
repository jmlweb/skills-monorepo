#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/bump-version.sh <patch|minor|major|x.y.z>
# Updates version in package.json, .claude-plugin/plugin.json, and SKILL.md

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARG="${1:?Usage: bump-version.sh <patch|minor|major|x.y.z>}"

# 1. Bump package.json (source of truth) — --no-git-tag-version so we control the commit
cd "$ROOT"
npm version "$ARG" --no-git-tag-version >/dev/null

# 2. Read the new version
VERSION=$(node -p "require('./package.json').version")

# 3. Propagate to plugin.json
PLUGIN="$ROOT/.claude-plugin/plugin.json"
TMP=$(mktemp)
jq --arg v "$VERSION" '.version = $v' "$PLUGIN" > "$TMP" && mv "$TMP" "$PLUGIN"

# 4. Propagate to SKILL.md frontmatter
SKILL="$ROOT/SKILL.md"
sed -i "s/^version: .*/version: $VERSION/" "$SKILL"

echo "Bumped to $VERSION"
echo "  - package.json"
echo "  - .claude-plugin/plugin.json"
echo "  - SKILL.md"
