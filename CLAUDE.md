# CLAUDE.md

This file provides guidance to Claude Code when working with this monorepo.

## What This Is

A monorepo that serves as both:
1. A **marketplace** for Claude Code plugins (`.claude-plugin/marketplace.json` at root)
2. The **source code** for all plugins under `plugins/`

Users install via:
```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install flowstate@jmlweb
```

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all plugins (via turbo)
pnpm test             # Run all tests (via turbo)
pnpm typecheck        # Type-check all plugins (via turbo)
pnpm version:sync     # Sync plugin.json versions → marketplace.json
```

## Structure

```
plugins/              # Each subdirectory is a complete Claude Code plugin
packages/             # Shared tooling (tsconfig, etc.)
.claude-plugin/       # Root marketplace definition
scripts/              # Monorepo scripts (version-sync, etc.)
```

## Adding a New Plugin

1. Create `plugins/<name>/` with the standard plugin structure:
   - `.claude-plugin/plugin.json` (manifest)
   - `skills/` (slash command definitions)
   - `src/` + `dist/` (TypeScript CLI if needed)
   - `package.json`
2. Add an entry to `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`
3. Run `pnpm version:sync` to verify versions match

## Releasing a Plugin

To cut a new release for a plugin (e.g. `flowstate`):

```bash
# 1. Bump version — updates package.json, plugin.json, SKILL.md, marketplace.json
cd plugins/flowstate
pnpm bump patch   # or: minor | major | x.y.z

# 2. Commit and tag (exact commands are printed by the bump script)
cd ../..
git add -A
git commit -m "chore: release flowstate v<VERSION>"
git tag plugins/flowstate/v<VERSION>
git push && git push --tags
```

Pushing the tag triggers `.github/workflows/release.yml`, which creates a GitHub Release automatically.

**Tag convention:** `plugins/<name>/v<semver>` — e.g. `plugins/flowstate/v2.3.0`

**Note:** `dist/` is rebuilt and staged automatically by the pre-commit hook whenever `src/` changes are committed. You do not need to run `pnpm build` or `git add dist/` manually.

## Key Constraints

- **`dist/` must be committed** — Claude Code clones the repo and does not run build steps. The pre-commit hook handles this automatically when `src/` changes are staged.
- **Zero runtime dependencies** per plugin — only devDependencies allowed
- **ESM only** — all packages use `"type": "module"`
- **Version sync** — `plugin.json` version must match `marketplace.json` version (enforced by `version:sync`)
- For plugins with relative paths, set `version` in the marketplace entry, not in `plugin.json`
- Shared TypeScript config lives in `packages/shared-config/tsconfig.base.json`

## Validation

Before publishing or opening a PR, validate the marketplace:

```bash
claude plugin validate .
# or inside Claude Code:
/plugin validate .
```

## Plugin Authoring Notes

- **`${CLAUDE_PLUGIN_ROOT}`** — use in hooks and MCP server configs to reference files inside the plugin's install directory (copied to cache on install)
- **`${CLAUDE_PLUGIN_DATA}`** — use for persistent data that must survive plugin updates
- **`strict` mode** (default: `true`) — `plugin.json` is the authority for component definitions; marketplace entry can only add on top. Set to `false` to let the marketplace entry define everything
- **`metadata.pluginRoot`** in `marketplace.json` — base directory prepended to relative plugin sources (e.g. `"./plugins"` lets you write `"source": "my-plugin"` instead of `"source": "./plugins/my-plugin"`)

## References

- [Plugin Marketplaces](https://code.claude.com/docs/es/plugin-marketplaces) — full schema, sources, strict mode, validation
- [Plugins Reference](https://code.claude.com/docs/es/plugins-reference) — plugin.json schema, `${CLAUDE_PLUGIN_ROOT}`, caching
- [Skill Creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) — how to write, evaluate and optimize SKILL.md files (progressive disclosure, description triggering, evals)
