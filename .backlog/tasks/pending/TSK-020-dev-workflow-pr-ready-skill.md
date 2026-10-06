---
id: TSK-020
title: dev-workflow: pr-ready skill
status: pending
priority: P2
tags: []
created: 2026-10-06
source: plan/PLN-002
depends-on: [TSK-019]
---

# dev-workflow: pr-ready skill

## Description

## Goal
Drive the user's own open PR to a mergeable state: branch updated, CI green, review comments handled, lean description, reviewers requested.

## Approach
1. Resolve PR (arg or current branch via `gh pr view`); refuse on base branch.
2. Update branch against base; stop and ask on conflicts.
3. Check CI; on failure apply ci-triage classification.
4. Fetch unresolved review threads via `gh api graphql`.
5. Classify threads: fixable without the user vs needs the user's decision.
6. Fix the first group, scoped to files in the branch diff; run related tests.
7. Draft one-line replies; post and resolve threads only after confirmation.
8. Trim the PR body to reviewer-useful content (what, why, how to test).
9. Undraft and request reviewers if asked.
10. Merge only with explicit `--merge` flag (off by default); optionally watch CI until green first.
11. Run `claude plugin validate .` and confirm the README command table lists `pr-ready`.

Files: `plugins/dev-workflow/skills/pr-ready/SKILL.md` (sonnet, effort medium), `plugins/dev-workflow/README.md`. Reads `shared/github-posting.md` created by TSK-019.


## Acceptance Criteria

- [ ] Resolves PR from arg or current branch via gh pr view; refuses on base branch
- [ ] Updates branch against base; stops and asks on conflicts
- [ ] On CI failure invokes ci-triage via the Skill tool (not subagent_type)
- [ ] Fetches unresolved review threads via gh api graphql and classifies fixable vs needs-user
- [ ] Fixes scoped to files in the branch diff; related tests run
- [ ] Replies are one-line; posting and resolving threads only after explicit confirmation
- [ ] PR body trimmed to what, why, how to test
- [ ] Undraft and reviewer request only when asked; merge only with --merge flag (off by default)
- [ ] Never pushes to base; never force-pushes without asking
- [ ] SKILL.md reads ${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md first and is 150 lines or fewer
- [ ] README command table lists pr-ready; claude plugin validate . passes

## Notes

## Learnings

## Progress Log

- [2026-10-06] Created