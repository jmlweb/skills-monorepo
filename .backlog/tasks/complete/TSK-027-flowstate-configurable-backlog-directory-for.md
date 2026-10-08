---
id: TSK-027
title: flowstate: configurable backlog directory for private backlogs
status: complete
priority: P2
tags: []
created: 2026-10-08
source: plan/PLN-008
depends-on: []
started: 2026-10-08
completed: 2026-10-08
---

# flowstate: configurable backlog directory for private backlogs

## Description

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



## Acceptance Criteria

- [ ] Step 0 verified: settings env reaches Bash tool calls and hooks; result recorded as a learning
- [ ] FLOWSTATE_BACKLOG_DIR resolved once at entry point (absolute, or relative to CLAUDE_PROJECT_DIR), falling back to .backlog walk-up; missing configured dir throws a typed error
- [ ] cwd→root rename landed as a separate mechanical commit with no behavior change
- [ ] setup --dir creates structure at custom location and prints the settings.local.json snippet; default private location <git-common-dir>/flowstate is worktree-safe
- [ ] New flowstate path command (plain and --json true)
- [ ] Skills no longer hardcode .backlog paths; parallel skill skips git add for out-of-repo backlogs
- [ ] pre-commit-reminder.sh uses the same resolution rule as the CLI
- [ ] Tests cover env absolute/relative/unset/missing, setup --dir, path command, and integration with env set
- [ ] README private-backlog section, architecture.md and SKILL.md updated; dist rebuilt; claude plugin validate passes; minor bump

## Notes

## Learnings

- LRN-005: Settings env delivery to Bash/hooks unverified; CLAUDE_PROJECT_DIR absent in Bash
- LRN-007: Verified: settings env reaches Bash and hooks; CLAUDE_PROJECT_DIR is hook-only
## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started
- [2026-10-08] Completed