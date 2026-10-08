---
id: TSK-021
title: dev-workflow: open-pr skill
status: active
priority: P2
tags: [dev-workflow, pr, skill, agent, cli]
created: 2026-10-07
source: plan/PLN-007
depends-on: []
started: 2026-10-08
---

# dev-workflow: open-pr skill

## Description

## Goal

Turn a finished branch into a pull request whose description is written for humans: readable first, scannable, and shaped by sections the repo or user defines.

## Context

- The dev-workflow flow has a gap: `commit` creates commits and `pr-ready` works only on an existing PR. No skill runs `gh pr create`.
- atlassian-polish shows the pattern for readable output: a skill that owns side effects and approvals, plus a read-only agent (`atlassian-formatter`, `tools: Read`) that follows `references/style-guide.md`.
- Users want configurable PR sections. A repo's `.github/pull_request_template.md` is already GitHub's standard for this, so it can serve as the config with no new format.
- dev-workflow has no `agents/` or `references/` directory yet. Both are new for this plugin.

## Approach

1. Template resolution, first match wins:
   1. `.github/pull_request_template.md`, then the other GitHub locations: `docs/`, root, and `PULL_REQUEST_TEMPLATE/` (if there are several, ask which one)
   2. `${CLAUDE_PLUGIN_DATA}/pr-template.md` (personal default that survives plugin updates)
   3. Built-in default in `references/default-pr-template.md`: Why / What changed / How to test / Notes for reviewers
2. Template semantics:
   - `##` headings define the sections, in order.
   - A `<!-- ... -->` comment under a heading is an instruction to the agent and is stripped from the output.
   - A comment starting with `optional` means the agent drops the section when it doesn't apply. Other sections are always kept. If there's nothing to say, the section contains `N/A`.
   - Checklists (`- [ ]`) are kept verbatim and never ticked by the agent.
3. Add a `dev-workflow:pr-writer` agent (`tools: Read`, `model: sonnet`, `effort: high`). It takes the template, the commit log `base..HEAD`, the diff stat and the key hunks, plus any linked ticket or `TSK-xxx`. It returns a title and a body. It never runs `git` or `gh`.
4. Add `references/pr-style-guide.md` (<300 lines) with the human-first rules:
   - Lead with why.
   - Plain words, short paragraphs.
   - No file-by-file changelog, no restating the diff, no marketing tone.
   - Link out instead of duplicating.
   - Reviewer notes point to risky spots.
5. Add `--range <base>...HEAD` to the `scan-secrets` and `detect-scope` CLI commands. Both read only staged changes today (`src/bin/dev-workflow.ts` help: "Scan staged changes…", "…from staged files and branch"). Without the flag, the staged-only behavior stays the default. Colocated vitest tests on a real temp git repo with commits ahead of a base branch.
6. Add a `find-pr-template` CLI command: resolve the template using the order in step 1 and return the path plus its source (`repo` | `user` | `builtin`). If there are several repo templates, return all of them and let the skill ask. Vitest tests cover every precedence level, the multi-template case, and a missing `${CLAUDE_PLUGIN_DATA}` directory (missing directory means no user template, not an error; other fs errors throw, per LRN-001).
7. Add the `skills/open-pr/SKILL.md` workflow (`model: sonnet`, `effort: medium`, `allowed-tools: Read, Agent, Bash(git:*), Bash(gh:*), Bash(node:*)`). Every CLI call uses `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" <cmd> --json true`.
   1. Preflight: `gh` is authenticated, not on the default branch, the branch has commits ahead of base, and no PR is already open for this branch (otherwise point to `pr-ready`).
   2. `scan-secrets --range <base>...HEAD`. Stop on findings.
   3. `find-pr-template`, or the `--template <path>` argument if given. `detect-scope --range <base>...HEAD` for the title scope.
   4. Invoke `pr-writer` via the Agent tool (`subagent_type: "dev-workflow:pr-writer"`).
   5. Show the title and body. The user approves, edits or cancels.
   6. Only after approval: `git push -u` and `gh pr create --draft` (`--ready` flag to skip draft), with the body passed via `--body-file -`.
   7. Print the PR URL and say it was created as a draft. Suggest `/dev-workflow:pr-ready` next.
8. Update `pr-ready` step 8 ("Trim the description"): drop its hardcoded What / Why / How to test. Resolve the template with `find-pr-template` and rewrite through `pr-writer`, so both skills share one definition of a readable PR. Keep the existing show-old-vs-new and ask-before-`gh pr edit` gate. Add `Agent` and `Bash(node:*)` to its `allowed-tools`.
9. Update `.claude-plugin/plugin.json`: mention PR creation in `description` (the current one only lists Commits, Changesets, PR reviews and doc audits). Don't add an `agents` key (auto-discovered). The version is bumped only at release via `pnpm bump minor`.
10. Update the README: command table, template docs with an example, how to set the personal default.
11. `pnpm typecheck && pnpm test`, then `claude plugin validate .`.



## Acceptance Criteria

- [ ] find-pr-template resolves repo, user (${CLAUDE_PLUGIN_DATA}/pr-template.md) and built-in templates in that order, with vitest coverage
- [ ] Template semantics: ## headings are sections, <!-- --> comments are stripped instructions, optional drops a section, checklists kept verbatim
- [ ] scan-secrets and detect-scope accept --range <base>...HEAD; staged-only stays the default; tests on a temp git repo
- [ ] Read-only agent agents/pr-writer.md (tools: Read) follows references/pr-style-guide.md
- [ ] skills/open-pr/SKILL.md: preflight, secrets scan, template, pr-writer, approval gate, then git push -u + gh pr create --draft
- [ ] pr-ready step 8 uses find-pr-template + pr-writer instead of hardcoded What/Why/How to test
- [ ] plugin.json description mentions PR creation; no agents key
- [ ] README documents the command and template configuration
- [ ] pnpm typecheck, pnpm test and claude plugin validate . pass

## Notes

## Learnings

## Progress Log

- [2026-10-07] Created
- [2026-10-07] Backlog review gap: ${CLAUDE_PLUGIN_DATA} is substituted into skill text, not exported to the CLI environment. find-pr-template must take the user template dir as an argument (e.g. --user-dir "${CLAUDE_PLUGIN_DATA}") instead of reading the env var; missing or empty --user-dir means no user template.
- [2026-10-08] Started