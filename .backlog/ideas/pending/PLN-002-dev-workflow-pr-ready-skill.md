---
id: PLN-002
title: dev-workflow: pr-ready skill
status: pending
created: 2026-10-01
complexity: medium
---

## Goal
Drive the user's own open PR to a mergeable state: branch updated, CI green, review comments handled, lean description, reviewers requested.

## Context
Usage analysis: ~60 prompts chaining these steps by hand ("make sure this PR is in perfect state: comments attended, tests fixed, ready to merge"); one PR took ~6 sessions. Existing skills stop at opening a PR (/ship, commit-push-pr) or review other people's PRs. Repeated corrections: fixes must stay scoped to the branch, replies not verbose, PR body without prose.

**Blocked by PLN-001 / TSK-019** (ci-triage): step 3 references it, and it creates `shared/github-posting.md`.

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

## Files to Modify
- `plugins/dev-workflow/skills/pr-ready/SKILL.md` — new skill (sonnet, effort medium); reads `${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md` first (created by PLN-001/TSK-019: confirm-before-post, English, no self-added attribution); surface-specific rules (graphql mutations, `--merge`, body trim) stay in the skill
- `plugins/dev-workflow/README.md` — command table

## Risks & Considerations
- Depends on the ci-triage idea; reference it rather than duplicating logic.
- Never push to base, never force-push without asking.
- Body must stay ≤150 lines; push detail into shared files.
- `gh api graphql` reply/resolve mutations write to a public PR: only after explicit user confirmation.
- Merge is outward-facing: opt-in `--merge` only.

## Open Questions
- None. Resolved 2026-10-06: merge is opt-in `--merge` flag, off by default.

## Revision History
- [2026-10-06] Marked github-posting.md as not existing (skill self-contained); added PLN-001 blocker; resolved merge question (opt-in flag); added plugin validate step; added graphql-mutation and merge risks.
- [2026-10-06] Reverted self-contained decision: reuse `shared/github-posting.md` from TSK-019 (generic rules only; review-pr left untouched).
