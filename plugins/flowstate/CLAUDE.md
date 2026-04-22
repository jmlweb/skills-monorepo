# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Flowstate is a Claude Code skill plugin that provides file-based backlog management. It's a zero-dependency TypeScript CLI that stores tasks, ideas, reports, and learnings as markdown files with YAML frontmatter in a `.backlog/` directory. The CLI is invoked by skill definitions (in `skills/`) that Claude Code executes.

## Commands

```bash
pnpm build          # Compile TypeScript → dist/
pnpm test           # Run all tests once (vitest run, non-watch)
pnpm test:watch     # Run tests in watch mode
pnpm run typecheck  # Type-check without emitting

# Run a single test file
pnpm vitest run src/core/id.test.ts

# Run the CLI directly (after build)
node dist/bin/flowstate.js <command> [flags]
```

Integration tests (`src/bin/flowstate.integration.test.ts`) spawn the compiled CLI, so **build before running them**.

## Architecture

### Entry Point & Command Dispatch

`src/bin/flowstate.ts` — Custom arg parser (no external deps), dispatches to command functions via switch statement. Supports `--json true` for structured output and `--body -` for stdin piping.

### Four Entity Types

| Entity   | Prefix | States                              | Dir                    |
|----------|--------|-------------------------------------|------------------------|
| Task     | TSK    | pending → active → complete/blocked | `.backlog/tasks/`      |
| Idea     | PLN    | pending → approved/discarded        | `.backlog/ideas/`      |
| Report   | RPT    | pending → triaged/discarded         | `.backlog/reports/`    |
| Learning | LRN    | active → superseded/archived        | `.backlog/learnings/`  |

IDs are zero-padded to 3 digits (e.g., `TSK-001`). The `id.ts` module handles parsing/formatting and accepts bare numbers or case-insensitive input.

### Core Modules (`src/core/`)

- **`paths.ts`** — `findBacklogRoot()` walks up from cwd to locate `.backlog/`. All path helpers derive from this.
- **`fs.ts`** — `readEntity`/`writeEntity`/`moveFile`/`findEntityFile` — all async, wraps `fs/promises`.
- **`frontmatter.ts`** — Custom YAML frontmatter parser/serializer (no library). Handles `[array]` syntax.
- **`markdown.ts`** — Section manipulation: find, append, replace, table row add/remove, stats table update. Used by index rebuilds.
- **`errors.ts`** — `BacklogNotFoundError`, `EntityNotFoundError`, `InvalidArgumentError`.
- **`types.ts`** — Shared type aliases: `EntityType`, `Priority`, `TaskStatus`, `IdeaStatus`, `ReportStatus`, `LearningStatus`, `ReportType`.
- **`id.ts`** — `parseId`/`formatId`/`normalizeIdInput` — zero-padded IDs, case-insensitive input, bare number support.
- **`date.ts`** — `today()` returns `YYYY-MM-DD` string.
- **`slug.ts`** — `titleToSlug()` converts a title to a kebab-case slug (max 5 words).

### Command Pattern

Every command in `src/commands/` follows the same signature:

```typescript
export async function commandName(cwd: string, input: Input): Promise<Result>
```

Commands generate IDs via `nextId()`, write entities via `writeEntity()`, and update `index.md` files. The `index-rebuild` command regenerates indexes from disk (idempotent recovery).

### Skills (`skills/`)

16 SKILL.md files define Claude Code skill prompts. Each specifies `allowed-tools`, `model` (haiku/sonnet), and step-by-step instructions. Skills invoke the CLI via Bash tool calls.

### Hooks (`hooks/`)

- `on-test-failure.sh` (PostToolUse) — Suggests `/flowstate:report` when tests fail.
- `pre-commit-reminder.sh` (PreToolUse) — Reminds to check learnings before commits.

## Key Constraints

- **Zero runtime dependencies** — only `@types/node`, `typescript`, `vitest` as devDeps.
- **ESM only** — `"type": "module"` in package.json, `"module": "Node16"` in tsconfig.
- **Strict TypeScript** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no unused locals/params.
- **Plugin version sync** — `plugin.json` and `package.json` versions must match (tested in `src/plugin.test.ts`).
- **Deterministic scoring** in `learning-search.ts` — tag exact (+3), tag partial (+1), title keyword (+2), body keyword (+1), stopword-filtered.

## Recent Rename

Commands `plan` → `idea` and `init` → `setup` were renamed to avoid conflicts with Claude Code's native `/plan` and `/init` commands. ID prefix `PLN` was kept. Directory `plans/` → `ideas/` with migration support in `setup.ts`.
