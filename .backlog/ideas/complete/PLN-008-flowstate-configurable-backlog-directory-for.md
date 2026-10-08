---
id: PLN-008
title: flowstate: configurable backlog directory for private backlogs
status: approved
created: 2026-10-08
complexity: high
reviewed: 2026-10-08
task-id: TSK-027
---

## Goal
Let a user keep the flowstate backlog outside version control without editing `.gitignore`, by pointing flowstate at a different directory (e.g. one inside `.git/`, which git never tracks). Keep the list of places flowstate looks short so resolution stays cheap.

## Context
Today the backlog is hard-wired to `<project>/.backlog`. `findBacklogRoot` (`src/core/paths.ts`) walks up parents probing for `.backlog`, and `backlogRoot(cwd)` is `join(cwd, ".backlog")`; every command receives that `cwd`. 17 skills and `hooks/pre-commit-reminder.sh` also mention or read `.backlog/...` paths directly. A private backlog needs one resolution point in the CLI and no hardcoded paths anywhere else.

## Approach
0. **Verify delivery first (blocking):** confirm Claude Code's settings `env` key reaches Bash tool calls and hooks (official docs + a manual check). Record the result as a learning. If it fails, stop and rethink step 2 before any code.
1. **Resolution order (deliberately two entries, resolved once at the entry point):** (a) env var `FLOWSTATE_BACKLOG_DIR`, absolute path, or relative to `CLAUDE_PROJECT_DIR` (falling back to cwd when unset) — one rule shared by CLI and hook; (b) existing walk-up for `.backlog`. No config-file parsing and no scanning of candidate directories, so the cost is one env read plus today's walk-up.
2. **Delivery through Claude Code settings:** users set the env var in the git-ignored `.claude/settings.local.json` (`"env": {"FLOWSTATE_BACKLOG_DIR": "..."}`), which Claude Code exports to sessions, so skills, CLI and hooks all see it. Verify this `env` behavior against official docs before relying on it — it is not in `references/plugin-docs.md`.
3. **CLI refactor (commit 1: mechanical rename only, no behavior change; commit 2: behavior):** `findBacklogRoot` returns the resolved backlog directory itself; `paths.ts` helpers join from it (drop the implicit `/.backlog` suffix). Mechanical rename of the `cwd` parameter to `root` across commands so the meaning is honest. `setup` creates the structure at the resolved directory; new `setup --dir <path>` creates it at a custom location and prints the `settings.local.json` snippet. Recommended private default: `<git-common-dir>/flowstate`, resolved via `git rev-parse --git-common-dir` so it works in worktrees (where `.git` is a file) and is shared across them. `BacklogNotFoundError` message mentions both sources.
4. **New `flowstate path` command:** prints the resolved backlog directory (`--json true` supported). Skills and the hook use it instead of hardcoding `.backlog`.
5. **Skills:** replace direct `.backlog/...` reads (e.g. `idea`, `start-task`, `review-idea`, `triage-report`, `next-task`, `add-task`, `learnings`, `complete-task`) with `flowstate path` plus the CLI list commands, or with the printed path. `setup` skill asks whether the backlog should be private and, if so, prints the `.claude/settings.local.json` snippet for the user to add. It never edits settings itself (auto-merge can come later).
6. **`parallel` skill:** step 4's `git add .backlog && git commit` must be skipped when the backlog is outside the repo's tracked tree. A shared out-of-repo backlog also removes the stale-pending-copy problem in worktrees; document it.
7. **Hook:** `pre-commit-reminder.sh` reads `FLOWSTATE_BACKLOG_DIR` with the same rule as the CLI (absolute, else relative to `CLAUDE_PROJECT_DIR`), falling back to `.backlog` only when the var is unset.
8. **Tests:** `paths.test.ts` (env absolute, env relative, env unset, env pointing at a missing dir throws a typed error, not an empty result — LRN-001), setup `--dir`, `path` command, integration test spawning the compiled CLI with the env var set.
9. **Docs:** `references/architecture.md`, plugin README (a short "private backlog" section with the settings snippet), root `SKILL.md` if it states the path.
10. Rebuild `dist/`, `claude plugin validate .`, minor bump of flowstate.

## Files to Modify
- `plugins/flowstate/src/core/paths.ts` — env resolution, helpers join from the resolved dir
- `plugins/flowstate/src/core/errors.ts` — not-found message
- `plugins/flowstate/src/commands/*.ts` — `cwd` → `root` rename; `setup.ts` gains `--dir`; new `path.ts`
- `plugins/flowstate/src/bin/flowstate.ts` — dispatch `path`, `setup --dir`, help text
- `plugins/flowstate/src/**/*.test.ts` and `src/bin/flowstate.integration.test.ts` — new and updated tests
- `plugins/flowstate/skills/*/SKILL.md` — remove hardcoded `.backlog` reads (setup, idea, start-task, review-idea, triage-report, next-task, add-task, add-learning, learnings, complete-task, parallel, and others that mention the path)
- `plugins/flowstate/hooks/pre-commit-reminder.sh` — honor the env var
- `plugins/flowstate/README.md`, `references/architecture.md`, `SKILL.md` — docs
- `plugins/flowstate/dist/**` — rebuilt by the pre-commit hook

## Risks & Considerations
- **Silent empty results (LRN-001):** a configured directory that doesn't exist must throw a typed error, never fall back to an empty list or silently to `.backlog`.
- **Relative paths:** a relative `FLOWSTATE_BACKLOG_DIR` is ambiguous across worktrees and subdirectories; resolve against the project root and prefer absolute in docs.
- **Settings `env` is unverified here:** if Claude Code does not export it to Bash tool calls and hooks, the whole delivery mechanism fails; confirm first.
- **Out-of-repo backlog is unversioned:** no git history, no backup, lost on re-clone. Say so in the README.
- **Exit codes and ID formats unchanged**; this must not alter any output format that skills parse.
- **Blast radius:** touches nearly every command signature and 17 skills; do it as a mechanical rename commit separate from behavior changes.

## Resolved Questions
- "Short option list" means the resolution candidates: two (env var, walk-up).
- Private default: `<git-common-dir>/flowstate` (never tracked, worktree-safe), not a literal `.git/flowstate` and not under `.claude/`.
- `setup` only prints the snippet; it does not edit `.claude/settings.local.json`.

## Revision History
- [2026-10-08] Added blocking step 0 (verify settings `env` reaches Bash and hooks); private default is `<git-common-dir>/flowstate` (worktree-safe); relative env path resolves against `CLAUDE_PROJECT_DIR`, same rule in the hook; `setup` prints the snippet only; rename split into its own commit; resolved all open questions.
