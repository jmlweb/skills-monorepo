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

## Key Constraints

- **`dist/` must be committed** — Claude Code clones the repo and does not run build steps
- **Zero runtime dependencies** per plugin — only devDependencies allowed
- **ESM only** — all packages use `"type": "module"`
- **Version sync** — `plugin.json` version must match `marketplace.json` version (enforced by `version:sync`)
- Shared TypeScript config lives in `packages/shared-config/tsconfig.base.json`
