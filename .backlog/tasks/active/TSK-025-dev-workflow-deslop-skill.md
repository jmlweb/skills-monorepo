---
id: TSK-025
title: dev-workflow: deslop skill
status: active
priority: P3
tags: [dev-workflow, skill, comments]
created: 2026-10-07
source: plan/PLN-003
depends-on: []
started: 2026-10-09
---

# dev-workflow: deslop skill

## Description

## Goal
Remove LLM-style comments and prose from the current branch diff, keeping only comments that explain why.

## Approach
1. Resolve base: upstream tracking branch, else `origin/HEAD`; ask if neither exists.
2. Scope to lines added in `git diff -M <base>...HEAD` (renames detected, so a moved file is not "all added"). Exclude generated, vendored and lock files. Scope is code comments and doc-comments only — not Markdown files.
3. Flag: comments restating the code, boilerplate JSDoc on obvious signatures, change-log comments ("// updated to fix X"), section-banner noise, marketing tone.
4. Keep: why-comments, invariants, workarounds with links, public API docs required by lint.
5. Show a numbered list; apply only the selected removals.
6. Update README: per-skill section + Requirements table row.
7. Run `claude plugin validate .`.
8. Ship as a minor bump of dev-workflow (new skill).

## Files to Modify
- `plugins/dev-workflow/skills/deslop/SKILL.md` — new skill (sonnet, effort medium, `allowed-tools: Read, Edit, Bash(git:*)`, `argument-hint: [base branch]`); quoted triggers and when-NOT line.
- `plugins/dev-workflow/README.md` — per-skill section + Requirements table row.

## Notes
- Open: numbered list across all files at once vs per file — settle during implementation.
- Deferred: `--pr` mode (overlaps `/pr-ready`).


## Acceptance Criteria

- [ ] Base resolved from upstream tracking branch, else origin/HEAD, else asks the user
- [ ] Scope is lines added in git diff -M <base>...HEAD; generated, vendored and lock files excluded; code comments and doc-comments only, no Markdown files
- [ ] Flags restating comments, boilerplate JSDoc, change-log comments, section-banner noise and marketing tone
- [ ] Keeps why-comments, invariants, workarounds with links and lint-required public API docs
- [ ] Shows a numbered list and applies only the selected removals; never rewrites pre-existing comments
- [ ] SKILL.md frontmatter: sonnet, effort medium, allowed-tools Read, Edit, Bash(git:*), argument-hint [base branch], 3+ quoted triggers, when-NOT line (/check-docs, /review-pr)
- [ ] dev-workflow README has a per-skill section and Requirements table row
- [ ] claude plugin validate . passes
- [ ] Released as a minor bump of dev-workflow

## Notes

## Learnings

## Progress Log

- [2026-10-07] Created
- [2026-10-09] Started