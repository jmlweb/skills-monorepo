# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Flowstate is a Claude Code skill plugin that provides file-based backlog management. It's a zero-dependency TypeScript CLI that stores tasks, ideas, reports, and learnings as markdown files with YAML frontmatter in a `.backlog/` directory. The CLI is invoked by skill definitions (in `skills/`) that Claude Code executes.

## Commands

```bash
pnpm build          # Compile TypeScript → dist/
pnpm test           # Run all tests once (vitest run, non-watch)
pnpm test:watch     # Run tests in watch mode
pnpm typecheck      # Type-check without emitting

# Run a single test file
pnpm vitest run src/core/id.test.ts

# Run the CLI directly (after build)
node dist/bin/flowstate.js <command> [flags]
```

Integration tests (`src/bin/flowstate.integration.test.ts`) spawn the compiled CLI, so **build before running them**.

## Architecture

See [`references/architecture.md`](./references/architecture.md) for entry point, entity types, core modules, command pattern, skills, and hooks.

## Key Constraints

- **Zero runtime dependencies** — only `@types/node`, `typescript`, `vitest` as devDeps.
- **ESM only** — `"type": "module"` in package.json, `"module": "Node16"` in tsconfig.
- **Strict TypeScript** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no unused locals/params.
- **Plugin version sync** — `plugin.json` and `package.json` versions must match (tested in `src/plugin.test.ts`).
- **Deterministic scoring** in `learning-search.ts` — tag exact (+3), tag partial (+1), title keyword (+2), body keyword (+1), stopword-filtered.

## Naming

Commands `plan` → `idea` and `init` → `setup` were renamed to avoid conflicts with Claude Code's native `/plan` and `/init`. ID prefix `PLN` was kept; directory `plans/` → `ideas/` (migration in `setup.ts`). Don't reintroduce the old names.
