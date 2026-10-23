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
- **`store.ts`** — `BacklogStore`, the storage seam for tasks, ideas and reports: `list`/`find` by bucket (`pending`, `active`, `complete`; blocked tasks sit in `active`), `create` (assigns the ID), `save` (rewrites, optionally moves). `main()` builds one store and passes it to every task, idea and report command. Learnings, `stats`, `index-rebuild`, `task-doctor` and `setup` still take `root`.
- **`file-store.ts`** — `FileStore`, the `.backlog/` backend: one file per entity, one folder per bucket. It owns ID assignment (`nextFileId`) and keeps `tasks/index.md` in step (row on create, rebuild on move). `store.contract.test.ts` holds the suite every backend must pass.
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

`learning-search` scores deterministically: tag exact (+3), tag partial (+1), title keyword (+2), body keyword (+1); query terms are stopword-filtered.

Shared learnings: `core/registry.ts` owns the user-level registry (`$XDG_CONFIG_HOME/flowstate/backlogs`, one absolute backlog path per line). `main()` registers the current backlog on every command, and `setup` registers the backlog it creates. `resolveSharedBacklogs` returns the other registered backlogs and skips missing, relative or `learnings/`-less entries with a reason, never pruning them. `learningSources` puts the local backlog first, so a stable sort keeps local learnings ahead on ties. Commands take `scope` and `shared` as input and never read the environment; the bin owns registration and the stderr warnings. `FLOWSTATE_SHARED=off` disables both directions.

## Skills (`skills/`)

20 SKILL.md files define Claude Code skill prompts. Each specifies `allowed-tools` (scoped, `Bash(node:*)` for CLI calls), `model` (haiku/sonnet), and step-by-step instructions. Skills invoke the CLI via Bash tool calls; `condense-tasks` and `condense-learnings` run in a forked subagent (`context: fork`).

## Hooks (`hooks/`)

- `on-test-failure.sh` (PostToolUse) — Suggests `/flowstate:report` when tests fail.
- `pre-commit-reminder.sh` (PreToolUse) — Before `git commit`, lists the active tasks so `/flowstate:complete-task` is considered.
