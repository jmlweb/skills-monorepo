---
id: TSK-079
title: dev-workflow read-only zones PreToolUse guard
status: pending
priority: P2
tags: [dev-workflow, hooks]
created: 2026-11-06
source: idea/PLN-033
depends-on: []
---

# dev-workflow read-only zones PreToolUse guard

## Description

### Goal

Ship a `PreToolUse` hook in `dev-workflow` that blocks file edits inside zones a repo declares in `.claude/read-only-zones.json`. Repos without that file see no change.

### Approach

1. Define the config: an array of `{ "glob", "why" }` entries, with `why` required. Use a hand-rolled glob, since plugins have zero runtime deps.
2. Implement the check in TypeScript under `src/`, compiled to committed `dist/`, with colocated vitest tests on real temp dirs.
3. Add `hooks/hooks.json` with the matcher `Edit|Write|NotebookEdit`, calling the compiled script through `node "${CLAUDE_PLUGIN_ROOT}/dist/..."`. `NotebookEdit` carries its path in `notebook_path`, not `file_path`.
4. Read the config from `CLAUDE_PROJECT_DIR` (hook-only, per LRN-007). Match globs relative to the root found by walking up from the target file to the nearest `.git` file or directory, with no git spawn. Stdin `cwd` can be a subdirectory, so it is not the root. Normalise paths first so `..` segments cannot escape a zone. A target outside the root is allowed.
5. Behaviour, in this order: no config file exits 0 before stdin is read. Malformed or unreadable config exits 2 with an actionable message. Stdin parse failure with a config present exits 2. A match exits 2 with the path and the `why` on stderr.
6. Treat `.claude/read-only-zones.json` itself as an implicit zone. The broken-config message says to fix the file by hand, since Edit is blocked on it.
7. Document the config in the README, including the implicit zone and that the config is always read from `CLAUDE_PROJECT_DIR`. Update the plugin description and keywords if they stop being accurate.
8. Run `claude plugin validate .`, then set the version with `pnpm bump`.

### Decisions

- No `bin` entry in `package.json`: the hook calls `dist/` directly.
- A config present only on a worktree's branch is not seen, because the no-config check runs before stdin. Documented, not handled.
- `/kickstart` integration is a later change, since it would couple flowstate to dev-workflow.
- Bash is out of scope: matching shell commands reliably is a much harder problem.

### Risks

- Fail closed means a broken config blocks all edits in that repo. That is intended, and the message must name the file and the parse error.
- Stdin parse failure fails closed only once a config exists, or a failure would block repos that never adopted the guard.
- Not a security boundary. Bash can still write to these paths, and the docs must say so.
- Plugin hooks load on install for every user, so the no-config path must be fast and silent.
- `plugin-docs.md` does not document hook stdin fields or exit 2 behaviour. Confirm both in the official docs.

## Acceptance Criteria

- [ ] Config at .claude/read-only-zones.json is an array of glob and why entries with why required, matched by a hand-rolled glob with zero runtime dependencies
- [ ] Check lives in src/core/read-only-zones.ts with colocated vitest tests on real temp dirs, compiled to committed dist/
- [ ] hooks/hooks.json matches Edit|Write|NotebookEdit and calls the compiled script through node and CLAUDE_PLUGIN_ROOT, reading notebook_path for NotebookEdit
- [ ] Globs match relative to the nearest .git file or directory found by walking up from the target file, covering a worktree case and a cwd in a subdirectory, with no git spawn
- [ ] Paths are normalised so .. segments cannot escape a zone, and a target outside the project root is allowed and tested
- [ ] No config exits 0 before stdin is read, malformed or unreadable config exits 2 naming the file and parse error, stdin parse failure with a config exits 2, and a match exits 2 with path and why on stderr
- [ ] The config itself is an implicit zone, and the broken-config message tells the reader to fix the file by hand
- [ ] Hook stdin fields and exit 2 behaviour are confirmed against official docs
- [ ] README documents the config format, the implicit zone, that config is always read from CLAUDE_PROJECT_DIR, and that this is not a security boundary because Bash can still write
- [ ] AGENTS.md map updated, plugin description and keywords checked, claude plugin validate . passes and the version is set with pnpm bump

## Notes

## Learnings

## Progress Log

- [2026-11-06] Created