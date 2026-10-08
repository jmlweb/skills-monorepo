# Flowstate Architecture

Reference for the internal structure of the Flowstate CLI. Skills (in `skills/`) orchestrate by invoking the CLI; the CLI does the file mutations deterministically.

## Entry Point & Command Dispatch

`src/bin/flowstate.ts` — Custom arg parser (no external deps), dispatches to command functions via switch statement. Supports `--json true` for structured output and `--body -` for stdin piping.

## Entity Types

| Entity   | Prefix | States                              | Dir                    |
|----------|--------|-------------------------------------|------------------------|
| Task     | TSK    | pending → active → complete/blocked | `.backlog/tasks/`      |
| Idea     | PLN    | pending → approved/discarded        | `.backlog/ideas/`      |
| Report   | RPT    | pending → triaged/discarded         | `.backlog/reports/`    |
| Learning | LRN    | active → superseded/archived        | `.backlog/learnings/`  |

IDs are zero-padded to 3 digits (e.g., `TSK-001`). The `id.ts` module handles parsing/formatting and accepts bare numbers or case-insensitive input.

## Core Modules (`src/core/`)

- **`paths.ts`** — `resolveBacklog()` is the single resolution point, called once in `src/bin/flowstate.ts`: `FLOWSTATE_BACKLOG_DIR` (absolute; relative resolves against the project root, never `CLAUDE_PROJECT_DIR`; a missing dir throws `BacklogDirMissingError`) else the nearest `.backlog/` walking up. It returns the backlog directory itself; commands take it as `root`, and all path helpers join from it. `resolveSetupTarget()` serves `setup --dir/--private`. The `path` command and `hooks/pre-commit-reminder.sh` apply the same rule; skills never hardcode `.backlog`.
- **`fs.ts`** — `readEntity`/`writeEntity`/`moveFile`/`findEntityFile` — all async, wraps `fs/promises`.
- **`frontmatter.ts`** — Custom YAML frontmatter parser/serializer (no library). Handles `[array]` syntax.
- **`markdown.ts`** — Section manipulation: find, append, replace, table row add/remove, stats table update. Used by index rebuilds.
- **`errors.ts`** — `BacklogNotFoundError`, `BacklogDirMissingError`, `EntityNotFoundError`, `InvalidArgumentError`.
- **`types.ts`** — Shared type aliases: `EntityType`, `Priority`, `TaskStatus`, `IdeaStatus`, `ReportStatus`, `LearningStatus`, `ReportType`.
- **`id.ts`** — `parseId`/`formatId`/`normalizeIdInput` — zero-padded IDs, case-insensitive input, bare number support.
- **`date.ts`** — `today()` returns `YYYY-MM-DD` string.
- **`slug.ts`** — `titleToSlug()` converts a title to a kebab-case slug (max 5 words).
- **`compress-validate.ts`** — `validateCompression()` gates LLM-rewritten bodies against structural loss (dropped IDs, URLs, dates, code, headings, protected sections). Used by `task-compress` and `learning-compress`.

## Command Pattern

Every command in `src/commands/` follows the same signature:

```typescript
export async function commandName(cwd: string, input: Input): Promise<Result>
```

Commands generate IDs via `nextId()`, write entities via `writeEntity()`, and update `index.md` files. The `index-rebuild` command regenerates indexes from disk (idempotent recovery).

## Skills (`skills/`)

17 SKILL.md files define Claude Code skill prompts. Each specifies `allowed-tools`, `model` (haiku/sonnet), and step-by-step instructions. Skills invoke the CLI via Bash tool calls.

## Hooks (`hooks/`)

- `on-test-failure.sh` (PostToolUse) — Suggests `/flowstate:report` when tests fail.
- `pre-commit-reminder.sh` (PreToolUse) — Reminds to check learnings before commits.
