---
id: PLN-026
title: flowstate: shared learnings across projects, on by default
status: approved
created: 2026-10-15
complexity: high
reviewed: 2026-10-15
task-id: TSK-051
---


## Goal
Let flowstate consult learnings captured in the user's other projects. The mode is on by default: every backlog the CLI touches joins a user-level registry, and learning lookups read the active learnings of all registered backlogs in place, read-only. Writes stay local; tasks, reports and ideas stay per project.

## Context
Learnings are the one entity that carries across projects (tooling footguns, Claude Code behaviour, testing patterns), yet each backlog is an island: `learningSearch` and `learningList` (`src/commands/learning-search.ts`, `learning-list.ts`) only read `learningsDir(root)`. Backlog resolution lives in `resolveBacklog` (`src/core/paths.ts`), called once in `main()` of `src/bin/flowstate.ts`, which is the natural hook for registration. PLN-008 (shipped) established env-var configuration delivered through Claude Code settings `env`, verified to reach Bash and hooks (LRN-007). Eleven skills call `learning-search`; `condense-learnings` calls `learning-list`.

## Approach
1. **Registry (`src/core/registry.ts`, new):** file at `$XDG_CONFIG_HOME/flowstate/backlogs`, falling back to `~/.config/flowstate/backlogs`; one absolute backlog path per line. Functions: `registryPath(env)`, `readRegistry(env)` (missing file → empty list; unreadable file → typed error), `registerBacklog(dir, env)` (idempotent append, creates the parent dir). Users may edit the file by hand.
2. **Opt-out:** `FLOWSTATE_SHARED=off` disables both directions: no registration, no shared reads. Any other value or unset means on. Exported constant next to `BACKLOG_DIR_ENV`.
3. **Auto-registration:** in `main()`, right after `resolveBacklog`, call `registerBacklog(root)` unless opted out. `setup` returns before `resolveBacklog`, so it also calls `registerBacklog(created)` after creating the backlog; otherwise a new backlog joins the registry only on its second command. A registry write failure prints one stderr warning and never fails the command.
4. **Shared sources:** `sharedBacklogs(root, env)` returns registered paths minus the current backlog. Each path that is missing or lacks a `learnings/` dir is skipped and reported, never silently dropped (LRN-001); no auto-prune, so an unmounted disk keeps its entry. A relative path in the registry (hand edit) is skipped with a warning, never resolved against cwd. `source` label = basename of the project root owning that backlog (parent of `.backlog`, or the path itself for custom dirs).
5. **Search/list:** `learningSearch` and `learningList` gain `scope: "local" | "all"` (CLI `--scope`, default `all`). Results gain `source` (`"local"` for the current backlog, else the project label). Local results rank first at equal score; `--limit` applies after merging. Skipped sources go to stderr as `warning: shared backlog <path> skipped (<reason>)`, so stdout's JSON array shape stays unchanged for every existing caller. Both commands currently swallow every `readdir` error on the local `learnings/` dir (`catch { return []; }`, the LRN-001 pattern): keep ENOENT as empty (fresh backlog) but rethrow any other error, and do not reuse that swallowing path for shared reads. `--scope` must apply whether the query comes from `--query` or its alias `--similar-to`.
6. **Callers that must stay local:** dedupe and mutation flows must never act on another project's learning. Pass `--scope local` in `add-learning`, `complete-task`, `retro` (`--similar-to` dedupe) and `condense-learnings` (`learning-list` feeding compression).
7. **Read-only skills:** `learnings`, `idea`, `start-task`, `next-task`, `parallel`, `review-idea`, `triage-report` keep their calls; add one line telling the model that a non-`local` `source` is another project's learning, so read it from that backlog's path and never edit it. `learnings` displays the source column.
8. **Text output:** append `source` as the last tab-separated column so positional readers of earlier columns stay correct.
9. **Tests:** `registry.test.ts` (XDG vs fallback, idempotent append, missing file → empty), `paths`/opt-out tests, `learning-search.test.ts` and `learning-list.test.ts` with two real temp backlogs (merge, ranking, `--scope local`, `--similar-to` + `--scope local` excludes a matching learning in another project while the default scope includes it, local non-ENOENT `readdir` error propagates, relative registry entry skipped, stale entry skipped + warning, opt-out), integration test spawning the compiled CLI with `XDG_CONFIG_HOME` pointed at a temp dir so tests never touch the real registry.
10. **Docs:** README section "Shared learnings" (default on, what is shared, the cross-project privacy warning with client work, the `FLOWSTATE_SHARED=off` snippet for `.claude/settings.local.json` or `~/.claude/settings.json`); `references/architecture.md`; root `SKILL.md` command table (`learning-search` / `learning-list` rows gain `--scope`) and `skills/guide/SKILL.md` wherever it lists those flags. GLOSSARY entry for "shared learning" / "registry".
11. Rebuild `dist/`, `pnpm lint:skills`, `claude plugin validate .`, minor bump of flowstate.

## Files to Modify
- `plugins/flowstate/src/core/registry.ts` — new: registry path, read, idempotent register, shared source discovery
- `plugins/flowstate/src/core/registry.test.ts` — new tests
- `plugins/flowstate/src/core/paths.ts` — `FLOWSTATE_SHARED` constant / opt-out helper
- `plugins/flowstate/src/core/errors.ts` — typed registry read error
- `plugins/flowstate/src/core/types.ts` — `source` field / `LearningScope` type
- `plugins/flowstate/src/commands/learning-search.ts` (+ test) — `scope`, multi-backlog merge, `source`, ranking
- `plugins/flowstate/src/commands/learning-list.ts` (+ test) — `scope`, `source`
- `plugins/flowstate/src/bin/flowstate.ts` — auto-registration, `--scope` flag, stderr warnings, help text, text output column
- `plugins/flowstate/src/bin/flowstate.integration.test.ts` — env-isolated registry end-to-end
- `plugins/flowstate/skills/{add-learning,complete-task,retro,condense-learnings}/SKILL.md` — `--scope local`
- `plugins/flowstate/skills/{learnings,idea,start-task,next-task,parallel,review-idea,triage-report}/SKILL.md` — how to read a non-local `source`
- `plugins/flowstate/README.md`, `plugins/flowstate/references/architecture.md`, `plugins/flowstate/SKILL.md` (command table), `plugins/flowstate/skills/guide/SKILL.md` — docs
- `GLOSSARY.md` — new terms
- `plugins/flowstate/dist/**` — rebuilt by the pre-commit hook

## Risks & Considerations
- **Privacy by default:** default-on mixes learnings across unrelated projects (client vs personal). Mitigation is the documented opt-out only; consider mentioning it in `setup` output.
- **ID collisions:** every project has its own `LRN-001`. Any command taking an ID (`learning-update`, `learning-move`) must keep resolving against the local backlog only; skills must use `source` to disambiguate when citing.
- **Dedupe across projects would be wrong:** a similar learning elsewhere is not a duplicate here. Step 6 guards this; a missed caller would block or supersede local captures.
- **Side effect outside the repo on every command:** tests must isolate `XDG_CONFIG_HOME` / `HOME`, or the suite pollutes the developer's real registry.
- **Worktrees:** a worktree with a private `<git-common-dir>/flowstate` backlog resolves to the same dir, so it registers once; a worktree with its own `.backlog` copy registers a duplicate-looking project. Acceptable; label shows the worktree name.
- **Cost:** search now reads N backlogs. Fine for personal scale; no index or cache. Entries are never auto-pruned, so stale paths accumulate and every search stats each one (and warns); users prune by editing the file.
- **Hand-edited registry:** relative or malformed lines must be skipped with a warning, never resolved against cwd (which would read a random directory).
- **Exit codes and ID formats unchanged.**

## Open Questions
- Warnings for skipped sources go to stderr rather than a `warnings` field in the JSON (agreed in grilling), because adding a field would turn the top-level array into an object and break every caller. Confirmed in review (2026-10-16).

## Revision History
- [2026-10-16] Review: register after `setup`; local `readdir` errors other than ENOENT rethrown (LRN-001); `--scope` covers `--similar-to` with a cross-project dedupe test; relative registry entries skipped; added `types.ts`, root `SKILL.md` command table and `guide` skill to files; added registry-growth and hand-edit risks; stderr-warnings open question confirmed.
