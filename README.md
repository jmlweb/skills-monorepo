# jmlweb Skills Monorepo

Marketplace and source code for my [Claude Code](https://claude.ai/code) plugins.

## Installation

```bash
claude plugin marketplace add jmlweb/skills-monorepo
```

Then install any plugin:

```bash
claude plugin install flowstate@jmlweb
```

## Plugins

| Plugin | Description | Version |
|--------|-------------|---------|
| [flowstate](./plugins/flowstate/) | Backlog management — tasks, plans, reports, and learnings, all in plain files | 2.2.1 |

## Development

### Prerequisites

- Node.js 18+
- pnpm 10+

### Setup

```bash
pnpm install
```

### Commands

```bash
pnpm build            # Build all plugins (via turbo)
pnpm test             # Run all tests
pnpm typecheck        # Type-check all plugins
pnpm version:sync     # Sync plugin.json versions into marketplace.json
```

### Structure

```
.claude-plugin/       # Marketplace definition
plugins/              # Each subdirectory is a self-contained Claude Code plugin
packages/             # Shared tooling (TypeScript config)
scripts/              # Monorepo scripts
```

### Adding a new plugin

1. Create `plugins/<name>/` with:
   - `.claude-plugin/plugin.json` (manifest)
   - `skills/` (slash command definitions)
   - `src/` + `dist/` (TypeScript CLI, if needed)
   - `package.json`
2. Add an entry to `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`
3. Run `pnpm version:sync` to verify versions match

> `dist/` must be committed — Claude Code clones the repo directly and does not run build steps on install.

## License

MIT
