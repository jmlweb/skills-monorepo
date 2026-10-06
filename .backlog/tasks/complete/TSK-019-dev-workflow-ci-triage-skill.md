---
id: TSK-019
title: dev-workflow: ci-triage skill
status: complete
priority: P2
tags: []
created: 2026-10-06
source: plan/PLN-001
depends-on: []
started: 2026-10-06
completed: 2026-10-06
---

# dev-workflow: ci-triage skill

## Description

## Goal
Explain a red CI run in one pass: classify each failure as real, flaky or infra, and recommend one action per failure.

## Approach
1. Accept a run URL, PR number, or default to the current branch's latest failed run (`gh run list --branch`).
2. Fetch failing jobs and logs with `gh run view <id> --log-failed`; trim to the failing steps.
3. Classify each failure:
   - real: points at file:line and the most likely commit in the diff
   - flaky: same test passes on base branch or in recent run history (`gh run list --workflow`)
   - infra: runner, network, registry, secrets, outage signatures
4. Recommend one action per failure: fix pointer, `gh run rerun <id> --failed`, or open one GitHub issue per flaky test (dedupe against open issues).
5. Read-only until the user confirms any rerun or issue creation.

Files: `plugins/dev-workflow/skills/ci-triage/SKILL.md`, `plugins/dev-workflow/shared/github-posting.md`, `plugins/dev-workflow/README.md`.


## Acceptance Criteria

- [x] Skill accepts run URL, PR number, or defaults to current branch latest failed run
- [x] Failing job logs fetched via gh run view --log-failed and trimmed to failing steps
- [x] Each failure classified real/flaky/infra with stated evidence
- [x] One recommended action per failure: fix pointer, rerun failed, or one GitHub issue per flaky test (deduped against open issues)
- [x] Read-only until user confirms any rerun or issue creation
- [x] shared/github-posting.md created; README command table updated
- [x] claude plugin validate . passes

## Notes

## Learnings

## Progress Log

- [2026-10-06] Created
- [2026-10-06] Scope refinement: github-posting.md must stay <=25 lines, generic only (confirm-before-post, English + one-line tone, never add attribution on own; follow user/project settings, no push to base/no force-push without asking). Skill must say 'Read ${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md first'. Do not change review-pr. Reused by PLN-002 pr-ready.
- [2026-10-06] Started
- [2026-10-06] Completed