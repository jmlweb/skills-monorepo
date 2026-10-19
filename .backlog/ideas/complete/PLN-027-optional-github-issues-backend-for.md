---
id: PLN-027
title: Optional GitHub Issues backend for tasks, ideas and reports
status: approved
created: 2026-10-17
complexity: high
reviewed: 2026-10-19
task-id: TSK-057
---


## Goal

Let a project keep its tasks, ideas and reports in GitHub Issues instead of `.backlog/` files, as an opt-in backend. File mode stays the default. Learnings stay local in `.backlog/learnings/` for v1.

## Context

- Motivation: `chore(backlog)` commits add noise to history. A backlog on GitHub also gets assignees, links to PRs and notifications.
- Today every CLI command reads and writes files directly through `core/paths.ts` and `core/fs.ts`. There is no storage seam.
- `index.md` tables and `index-rebuild` assume files. `hooks/pre-commit-reminder.sh` counts `tasks/active/*.md`.
- 15 skills and the root `SKILL.md` reference `{{BACKLOG}}/...` paths. Some read directories directly: for example, `idea` step 2 reads `tasks/active/` and `reports/pending/`.
- Learnings are keyword-scored, compressed and shared across projects through the file registry (`core/registry.ts`). Moving them is a separate, larger change, so they stay out of v1.
- Agreed decisions:
  - IDs keep the `PREFIX-NNN` format, but NNN is the issue number, zero-padded. Example: issue #51 labelled `flowstate:task` is `TSK-051`.
  - There is no separate counter, so numbers are not contiguous per type.
  - `PLN`, `RPT` and `ideas/` naming stay as they are.
- `gh` is the transport, called through `execFile` the same way `privateBacklogDir` calls `git`. This keeps zero npm runtime deps.

## Approach

### Phase 1: storage seam (no behaviour change)

1. Define a `BacklogStore` interface in `src/core/store.ts`. It covers:
   - list entities by type and status
   - read an entity by ID
   - create an entity, which assigns the ID
   - update frontmatter and body
   - move or transition status
   - search
2. Implement `FileStore` in `src/core/file-store.ts` by moving the existing logic out of `fs.ts`, `paths.ts`, `next-id.ts` and the index updates.
3. Refactor the task, idea and report commands to take a store instead of `root`. Learning commands keep file access.
4. Add `resolveStore()` next to `resolveBacklog()`. `main()` builds the store once and dispatches with it.
5. Make sure every directory read a skill does has a CLI equivalent (`task-list --status active`, `report-list --status pending` if missing). Then rewrite the skills to call the CLI instead of reading `{{BACKLOG}}/tasks/...` paths.
6. Existing tests must pass unchanged in behaviour. Add store-level contract tests that later run against both backends.

### Phase 2: GitHub backend

7. Add `src/core/gh.ts`, a thin `execFile("gh", ...)` wrapper. It parses `--json` output and maps failures to typed errors in `errors.ts`:
   - `GhMissingError`
   - `GhAuthError`
   - `GhRepoError`
8. Implement `GithubStore` in `src/core/github-store.ts`:
   - Entity type is a `flowstate:task`, `flowstate:idea` or `flowstate:report` label.
   - Task status: `status:active` or `status:blocked`. Pending is open with no status label, and complete is closed.
   - Idea and report final states map to closed plus one `status:<x>` label: `status:approved`, `status:discarded` or `status:triaged`. The label is the source of truth, and the state reason is cosmetic.
   - When the store reads a closed idea or report, it requires exactly one valid final-state label. A closed issue with no label, an unknown label or two labels is rejected with a typed error naming the issue. `task-doctor` reports these issues.
   - Status transitions swap labels atomically in one `gh issue edit` call (`--add-label` with `--remove-label`).
   - The contract tests cover every state's label mapping and the rejection paths.
   - Priority is a `P1` to `P4` label. Tags become labels.
   - `depends-on`, `blocked-by`, `source`, `task-id` and dates go in a fenced metadata block at the top of the body. Sections (acceptance criteria, Progress Log, plan sections) follow as markdown.
   - The ID comes from the issue number.
   - Labels are created on first use with `gh label create --force`.
9. Backend selection in `resolveStore()`:
   - `FLOWSTATE_BACKEND=github` selects GitHub, and anything else selects files.
   - The repo comes from `FLOWSTATE_GITHUB_REPO`, else `gh repo view --json nameWithOwner`.
   - Learnings still resolve `.backlog/learnings/` as today.
9b. Make `task-compress` and `task-condense` work in GitHub mode through the store:
   - `task-compress` reads the issue body, runs `validateCompression()` unchanged, and writes the body back with `gh issue edit --body-file`. The metadata block is protected, the same way protected sections are today.
   - `task-condense` reads closed task issues through the store and rewrites each body the same way.
   - If any part cannot map cleanly (for example, file-only index side effects), it is skipped in GitHub mode with an explicit message, never silently.
10. Add `setup --github`:
    - Verify `gh auth status` and the repo.
    - Create the labels.
    - Create only `.backlog/learnings/`.
    - Print the settings snippet `{"env":{"FLOWSTATE_BACKEND":"github"}}` (same pattern as `settingsSnippet`).
11. Change `index-rebuild`, `stats`, `task-doctor` and `path`:
    - In GitHub mode, `index-rebuild` and `task-doctor` print "not applicable" or run GitHub equivalents.
    - `stats` aggregates `gh issue list` results.
    - `path` still prints the learnings backlog dir.
12. Change `hooks/pre-commit-reminder.sh` so that in GitHub mode it calls the CLI (`task-list --status active`) instead of counting files. The hook should stay fast and exit 0 silently if `gh` fails.
13. Run the contract tests against `GithubStore` using a stub `gh` executable on `PATH`. No network in CI. Add one opt-in sandbox script that runs against a real throwaway repo.
14. Docs: architecture.md, the README, `GLOSSARY.md` (Backlog definition now covers the GitHub backend), and the setup and guide skills.

## Files to Modify

- `plugins/flowstate/src/core/store.ts`: new `BacklogStore` interface
- `plugins/flowstate/src/core/file-store.ts`: new, file backend extracted from the existing helpers
- `plugins/flowstate/src/core/github-store.ts`: new, GitHub Issues backend
- `plugins/flowstate/src/core/gh.ts`: new, `gh` execFile wrapper and JSON parsing
- `plugins/flowstate/src/core/paths.ts`: add `resolveStore()` and the `FLOWSTATE_BACKEND` and `FLOWSTATE_GITHUB_REPO` constants
- `plugins/flowstate/src/core/errors.ts`: add the gh error classes
- `plugins/flowstate/src/core/fs.ts`: keep the low-level helpers; entity logic moves to file-store
- `plugins/flowstate/src/commands/task-*.ts`, `idea-*.ts`, `report-*.ts`, `next-id.ts`, `stats.ts`, `index-rebuild.ts`: take a store instead of `root`
- `plugins/flowstate/src/commands/setup.ts`: add the `--github` path
- `plugins/flowstate/src/bin/flowstate.ts`: build the store, add the `--github` flag, help text
- `plugins/flowstate/src/commands/*.test.ts`: adapt; add store contract tests run against both backends
- `plugins/flowstate/hooks/pre-commit-reminder.sh`: GitHub-mode branch via the CLI
- `plugins/flowstate/skills/{idea,next-task,overview,parallel,start-task,complete-task,review-idea,triage-report,report,add-task,guide,setup}/SKILL.md`: replace direct `{{BACKLOG}}` directory reads with CLI calls; document `setup --github`
- `plugins/flowstate/SKILL.md`: describe the backend option
- `plugins/flowstate/references/architecture.md`: store layer and GitHub mapping
- `plugins/flowstate/README.md`: GitHub mode section
- `GLOSSARY.md`: Backlog definition covers the GitHub backend
- `plugins/flowstate/dist/**`: rebuilt and committed

## Risks & Considerations

- Phase 1 is a large refactor that touches every command. It must land with no behaviour change and green tests before phase 2 starts. Consider splitting phase 1 and phase 2 into separate tasks on approval.
- The issue-number ID changes what an ID means (it is no longer a per-type counter), even though the format is unchanged. Issues and PRs share one number space, so an ID can point at a PR number with no flowstate label. Lookup must check the type label and fail with a clear error.
- Latency: every command becomes a network call. Hooks and `next-task` must stay responsive, so set a timeout on `gh` calls.
- Rate limits and pagination: `gh issue list --limit` must be explicit. A silent truncation would break "empty vs lookup failed" (LRN-001).
- Body round-trip: the metadata block must survive humans editing the issue on github.com. Parse defensively and fail loudly on a malformed block.
- The CLI-owns-mutation invariant still holds: skills never call `gh` directly.
- `gh` is a new external prerequisite in GitHub mode only, not an npm dependency. Zero runtime deps stay intact.
- Compression (`task-compress`, `task-condense`) on issues rewrites the issue body, and the old version stays in GitHub edit history. That is acceptable but worth documenting. A human editing the body at the same time can lose changes, so compress reads and writes inside one command run and never caches bodies.
- Shared learnings are unaffected, because learnings stay file-based.
- An import command from `.backlog` to GitHub is out of scope for v1 and recorded as a follow-up.

## Revision History

- 2026-10-17: Resolved the open questions. `task-compress` and `task-condense` must work in GitHub mode (step 9b). Final idea and report states use one `status:<x>` label as the source of truth, with strict validation (step 8).
