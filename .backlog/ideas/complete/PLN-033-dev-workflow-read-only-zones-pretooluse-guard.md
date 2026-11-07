---
id: PLN-033
title: dev-workflow read-only zones PreToolUse guard
status: approved
created: 2026-11-06
complexity: medium
reviewed: 2026-11-06
task-id: TSK-079
---

## Goal

Ship a `PreToolUse` hook in `dev-workflow` that blocks file edits inside zones a repo declares in `.claude/read-only-zones.json`. Repos without that file see no change.

## Context

`subbuteo` has `guard-readonly.mjs`, which blocks agent edits to WP core and third-party plugins. Rules in AGENTS.md only ask; a hook enforces. The pattern is general: vendored code, generated output and parent themes exist everywhere.

The source is not portable as it stands. Its zones are hardcoded regexes and a plugin list. It exits 0 on any parse failure, so bad input silently disables the guard.

This would be the first hook in `dev-workflow`. flowstate's bash hooks need `jq`; this hook runs on Node, so it needs no extra tool.

Its sibling `guard-essential-plugins.mjs` covers destructive Bash. This idea leaves Bash out: matching shell commands reliably is a much harder problem.

## Approach

1. Define the config: an array of `{ "glob", "why" }` entries, with `why` required. Use a hand-rolled glob, since plugins have zero runtime deps.
2. Implement the check in TypeScript under `src/`, compiled to committed `dist/`, with colocated vitest tests on real temp dirs.
3. Add `hooks/hooks.json` with the matcher `Edit|Write|NotebookEdit`, calling the compiled script through `node "${CLAUDE_PLUGIN_ROOT}/dist/..."`. `NotebookEdit` carries its path in `notebook_path`, not `file_path`.
4. Resolve paths against `CLAUDE_PROJECT_DIR` (hook-only, per LRN-007). When the session `cwd` from stdin sits in a worktree, match relative to that worktree instead. Normalise paths first so `..` segments cannot escape a zone.
5. Behaviour, in this order: no config file exits 0 before stdin is read. Malformed or unreadable config exits 2 with an actionable message. Stdin parse failure with a config present exits 2. A match exits 2 with the path and the `why` on stderr.
6. Treat `.claude/read-only-zones.json` itself as an implicit zone.
7. Document the config in the README, including the implicit zone. Update the plugin description and keywords if they stop being accurate.
8. Run `claude plugin validate .`, then set the version with `pnpm bump`.

## Files to Modify

- `plugins/dev-workflow/hooks/hooks.json` — new, wires the hook
- `plugins/dev-workflow/src/core/read-only-zones.ts` and `read-only-zones.test.ts` — config parsing and matching, including a worktree case
- `plugins/dev-workflow/src/bin/` — new hook entry point
- `plugins/dev-workflow/package.json` — `bin` entry for the hook
- `plugins/dev-workflow/dist/` — rebuilt output
- `plugins/dev-workflow/README.md` — hook section and config format
- `AGENTS.md` — the map says dev-workflow has no hooks

## Risks & Considerations

- Fail closed means a broken config blocks all edits in that repo. That is intended, and the message must name the file and the parse error.
- Stdin parse failure fails closed only once a config exists, or a failure would block repos that never adopted the guard.
- Not a security boundary. Bash can still write to these paths, and the docs must say so.
- Plugin hooks load on install for every user, so the no-config path must be fast and silent.
- `CLAUDE_PROJECT_DIR` points at the main checkout, so worktree edits from flowstate `parallel` can miss zones silently unless step 4 handles them.

## Revision History

- [2026-11-07] Replaced `MultiEdit` with `NotebookEdit` in the matcher, ordered the config check before stdin, settled the config on `glob` plus required `why`, added worktree matching and the implicit config zone, added the `bin`, `AGENTS.md`, validate and bump steps. `/kickstart` integration is a later change, since it would couple flowstate to dev-workflow.
