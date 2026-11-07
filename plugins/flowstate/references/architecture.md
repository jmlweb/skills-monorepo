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

- **`paths.ts`** — `resolveBacklog()` is the single resolution point, called once in `src/bin/flowstate.ts`: `FLOWSTATE_BACKLOG_DIR` (absolute; relative resolves against the project root, never `CLAUDE_PROJECT_DIR`; a missing dir throws `BacklogDirMissingError`) else the nearest `.backlog/` walking up. It returns the backlog directory itself; commands take it as `root`, and all path helpers join from it. `resolveSetupTarget()` serves `setup --dir/--private`; `settingsSnippet()`/`envSettingsSnippet()` print the `.claude/settings.local.json` fragment. The `path` command and `hooks/pre-commit-reminder.sh` apply the same rule; skills never hardcode `.backlog`.
- **`fs.ts`** — `readEntity`/`writeEntity`/`moveFile`/`findEntityFile` — all async, wraps `fs/promises`.
- **`store.ts`** — `BacklogStore`, the storage seam for tasks, ideas and reports: `list`/`find` by bucket (`pending`, `active`, `complete`; a blocked task sits in `pending` or `active`, and `taskStatusOf` derives its status from bucket plus `blocked-by`), `create` (assigns the ID), `save` (rewrites, optionally moves). `main()` builds one store through `resolveStore()` and passes it to every task, idea, report and `stats` command. Learnings, `index-rebuild`, file-mode `task-doctor` and `setup` still take `root`.
- **`file-store.ts`** — `FileStore`, the `.backlog/` backend: one file per entity, one folder per bucket. It owns ID assignment (`nextFileId`) and keeps `tasks/index.md` in step (row on create, rebuild on move). `store.contract.test.ts` holds the suite every backend must pass; it runs against `FileStore` and `GithubStore`.
- **`backend.ts`** — `resolveStore(root, cwd)`: `FLOWSTATE_BACKEND=github` selects `GithubStore`, anything else `FileStore`. The repository comes from `FLOWSTATE_GITHUB_REPO` (`owner/name`), else `gh repo view --json nameWithOwner` in `cwd`. `root` is the backlog directory in both modes; in GitHub mode only `learnings/` lives there.
- **`gh.ts`** — `createGhRunner()`: `execFile("gh", …)` with a 20 s timeout, the same pattern `privateBacklogDir` uses for `git`; no npm dependency. A failed run is classified by stderr into `GhMissingError` (ENOENT), `GhAuthError`, `GhRepoError` or `GhCommandError`. `ghJson()` parses `--json` output and fails loudly on anything else.
- **`github-store.ts`** — `GithubStore`, the GitHub Issues backend (see the mapping below). `inspect()` and `repairLabels()` serve `task-doctor`.
- **`metadata-block.ts`** — `splitMetadataBlock`/`joinMetadataBlock`: the fenced ```` ```flowstate ```` block at the top of an issue body, parsed with the frontmatter parser. A missing block reads as empty metadata (an issue typed by hand); an unclosed fence or a line without `key: value` throws `MetadataBlockError` naming the issue.

### GitHub Issues backend

Opt-in per project with `setup --github` (verifies `gh auth status` and the repo, creates the labels with `gh label create --force`, creates only `learnings/`, prints the `{"env":{"FLOWSTATE_BACKEND":"github"}}` snippet). `gh` is an external prerequisite in this mode only.

| File mode | GitHub mode |
|-----------|-------------|
| `TSK-051` from a per-type counter | `TSK-051` is issue #51; numbers are shared with ideas, reports and PRs, so they are not contiguous per type. `next-id` is learnings-only |
| folder `tasks/pending`, `tasks/active`, `tasks/complete` | open issue without `status:active`; open with `status:active`; closed |
| `status: blocked` + `blocked-by` in frontmatter | `status:blocked` label + `blocked-by` in the metadata block; the bucket is unchanged (LRN-040: blocked in pending stays pending) |
| `ideas/complete` with `status: approved\|discarded` | closed issue with exactly one of `status:approved`, `status:discarded` |
| `reports/complete` with `status: triaged\|discarded` | closed issue with exactly one of `status:triaged`, `status:discarded` |
| `priority: P2`, `tags: [a, b]` | labels `P2`, `a`, `b` (tag labels are created on first use) |
| other frontmatter (`created`, `source`, `depends-on`, `started`, `completed`, `complexity`, `type`, `severity`, `task-id`, `compressed`, …) | the metadata block |
| entity `path` | the issue URL |

Rules the store enforces:

- Type labels `flowstate:task`, `flowstate:idea`, `flowstate:report` say what an issue is. `find` returns `undefined` for an ID of another prefix and for a number that is no issue; it throws `GhIssueTypeError` when the number is a pull request or carries another (or no) type label, naming the ID it would be.
- A closed idea or report with no final-state label, two of them, or a label of the wrong type throws `GhIssueStateError` naming the issue; `task-doctor` lists these under `invalid` instead of failing. An open idea or report reads as pending whatever status labels it carries.
- Every `save` is one `gh issue edit` carrying the title, the body (`--body-file -`) and the label swap (`--add-label`/`--remove-label`), followed by `issue close` (`--reason not planned` for discarded) or `issue reopen` only when the bucket changes. Tasks own every label on their issue; ideas and reports own only the reserved ones, so a human's extra label survives.
- Labels drift (someone edits them on github.com); the issue state and the metadata block are the truth. `task-doctor` realigns labels from them and never guesses a final state.
- `gh issue list` always passes `--limit 1000`; a result that reaches the limit throws instead of truncating (LRN-001).
- `task-compress` and `task-condense` work unchanged: the store strips the block before handing the body to the command and writes it back on save, so the validator never sees it and cannot lose it. The previous body stays in the issue's edit history.
- `index-rebuild` reports tasks as not applicable (`--type tasks` → `rebuilt: none`, `all` → learnings only); `path --json` adds `backend` and `repo`.

Not in scope yet: importing an existing `.backlog/` into issues.
- **`frontmatter.ts`** — Custom YAML frontmatter parser/serializer (no library). Handles `[array]` syntax.
- **`markdown.ts`** — Section manipulation: find, append, replace, table row add/remove, stats table update. Used by index rebuilds.
- **`args.ts`** — `parseArgs()` for the entry point: `--key value` pairs, repeated flags into `flagArrays`, positionals. Only the listed switches (`--json`, `--private`, `--dry-run`, `--all`, `--include-archived`) may appear bare; any other flag without a value, or followed by a `--` token, throws `InvalidArgumentError` instead of storing `"true"`.
- **`errors.ts`** — `BacklogNotFoundError`, `BacklogDirMissingError`, `EntityNotFoundError`, `InvalidArgumentError`, `SectionNotFoundError`, `RegistryReadError`; GitHub mode adds `GhMissingError`, `GhAuthError`, `GhRepoError`, `GhCommandError`, `GhIssueTypeError`, `GhIssueStateError`, `MetadataBlockError`. All exit 1 through `main()`.
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

- `on-test-failure.sh` (PostToolUseFailure, matcher `Bash`) — Suggests `/flowstate:report` when a test command fails. `PostToolUse` fires only on success, so the hook keys on `tool_name`, `is_interrupt` and the `Exit code N` first line of `error`, the fields the failure payload documents; there is no `exit_code` field.
- `pre-commit-reminder.sh` (PreToolUse, matcher `Bash`) — Before `git commit`, lists the active tasks so `/flowstate:complete-task` is considered. With `FLOWSTATE_BACKEND=github` it asks the CLI (`task-list --status active --json true`) instead of counting files, and exits 0 silently when `gh` is missing, logged out or failing.
- Both print `hookSpecificOutput` with `hookEventName` and `additionalContext`, built with `jq` so task titles holding quotes or backslashes stay valid JSON. Hooks use bash, coreutils, `find`, `grep`, `sed` and `jq` only (plus `node` for the CLI in GitHub mode); `scripts/flowstate-hooks.test.mjs` feeds them the documented payloads, with `scripts/gh-stub.mjs` standing in for `gh`.

## Testing the GitHub backend

`scripts/gh-stub.mjs` is a stand-in `gh` driven by a JSON state file (`GH_STUB_STATE`); `src/core/github-stub.test-support.ts` installs it first on `PATH` for a test. The contract suite, `github-store.test.ts`, `task-doctor-github.test.ts`, `setup-github.test.ts` and `flowstate.github.integration.test.ts` all run through it, so CI needs no network and no token. `pnpm sandbox:github-backend --repo owner/name` runs the same lifecycle against a real throwaway repository and is never part of `pnpm test`.
