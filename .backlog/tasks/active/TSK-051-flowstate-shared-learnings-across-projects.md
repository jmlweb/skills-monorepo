---
id: TSK-051
title: flowstate: shared learnings across projects, on by default
status: active
priority: P2
tags: [flowstate, learnings]
created: 2026-10-15
source: idea/PLN-026
depends-on: []
started: 2026-10-15
---

# flowstate: shared learnings across projects, on by default

## Description

### Goal
Let flowstate consult learnings captured in the user's other projects. The mode is on by default: every backlog the CLI touches joins a user-level registry, and learning lookups read the active learnings of all registered backlogs in place, read-only. Writes stay local; tasks, reports and ideas stay per project.

### Context
Learnings are the one entity that carries across projects (tooling footguns, Claude Code behaviour, testing patterns), yet each backlog is an island: `learningSearch` and `learningList` (`src/commands/learning-search.ts`, `learning-list.ts`) only read `learningsDir(root)`. Backlog resolution lives in `resolveBacklog` (`src/core/paths.ts`), called once in `main()` of `src/bin/flowstate.ts`, which is the natural hook for registration. PLN-008 (shipped) established env-var configuration delivered through Claude Code settings `env`, verified to reach Bash and hooks (LRN-007). Eleven skills call `learning-search`; `condense-learnings` calls `learning-list`.

### Approach
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

## Acceptance Criteria

- [x] registry.ts with XDG path, readRegistry, idempotent registerBacklog + tests — evidence: tests/core/registry.test.ts green (2026-10-15)
- [x] FLOWSTATE_SHARED=off disables registration and shared reads — evidence: FLOWSTATE_SHARED=off integration test green (2026-10-15)
- [x] Auto-registration in main() and after setup; registry write failure only warns — evidence: integration: auto-registration in main and setup (2026-10-15)
- [x] sharedBacklogs skips missing, relative and learnings-less entries with stderr warning — evidence: resolveSharedBacklogs skip tests green (2026-10-15)
- [x] learning-search and learning-list support --scope local|all (default all, also with --similar-to) and return source; local ranks first; non-ENOENT local readdir errors rethrown — evidence: learning-search/list --scope tests green (2026-10-15)
- [x] add-learning, complete-task, retro, condense-learnings pass --scope local — evidence: callers add-learning, complete-task, retro, condense-learnings pass --scope local (2026-10-15)
- [x] Read-only skills explain non-local source; learnings shows source column — evidence: learnings shows source; read-only skills carry the non-local note (2026-10-15)
- [x] Text output appends source as last column — evidence: integration test: source is last text column (2026-10-15)
- [x] Tests with two temp backlogs and isolated XDG_CONFIG_HOME, incl. compiled-CLI integration test — evidence: registry, sharing, scope and integration tests green (314) (2026-10-15)
- [x] README, architecture.md, root SKILL.md table, guide, GLOSSARY updated — evidence: README, architecture, SKILL.md table, GLOSSARY updated (2026-10-15)
- [x] dist rebuilt, lint:skills and claude plugin validate pass, flowstate minor bump — evidence: dist rebuilt; lint:skills 0/0; plugin validate passes; bumped 2.15.0 (2026-10-15)

## Notes

## Learnings

## Progress Log

- [2026-10-15] Created
- [2026-10-15] Started
- [2026-10-15] Implemented registry, scope and source; shared learnings on by default with FLOWSTATE_SHARED=off opt-out. Full suite green: flowstate 314, dev-workflow 145, atlassian-polish 37, scripts 98. lint:skills 0/0; claude plugin validate passes for marketplace and flowstate. flowstate bumped to 2.15.0. Integrity script and its fixture now disable sharing so tests do not write the real registry. Not committed; TSK-051 stays active for review.