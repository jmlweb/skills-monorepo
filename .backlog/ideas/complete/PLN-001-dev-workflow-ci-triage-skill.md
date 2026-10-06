---
id: PLN-001
title: dev-workflow: ci-triage skill
status: approved
created: 2026-10-01
complexity: medium
reviewed: 2026-10-06
task-id: TSK-019
---

## Goal
Explain a red CI run in one pass: classify each failure as real, flaky or infra, and recommend one action per failure.

## Context
Usage analysis: 52 prompts about CI failures, 22 pasted GitHub Actions run URLs ("why is this failing? <url>"), recurring flaky-test cleanup ("create 1 issue per flaky test"). No existing skill covers CI log triage. Generic: any GitHub Actions repo.

## Approach
1. Accept a run URL, PR number, or default to the current branch's latest failed run (`gh run list --branch`).
2. Fetch failing jobs and logs with `gh run view <id> --log-failed`; trim to the failing steps.
3. Classify each failure:
   - real: points at file:line and the most likely commit in the diff
   - flaky: same test passes on base branch or in recent run history (`gh run list --workflow`)
   - infra: runner, network, registry, secrets, outage signatures
4. Recommend one action per failure: fix pointer, `gh run rerun <id> --failed`, or open one GitHub issue per flaky test.
5. Read-only until the user confirms any rerun or issue creation.

## Files to Modify
- `plugins/dev-workflow/skills/ci-triage/SKILL.md` — new skill (sonnet, effort medium, `Bash(gh:*)`, `Bash(git:*)`, Read, Grep)
- `plugins/dev-workflow/shared/github-posting.md` — shared rules: confirm before posting, English, no AI attribution
- `plugins/dev-workflow/README.md` — command table

## Risks & Considerations
- Large logs: cap and grep around failure markers to keep tokens low.
- Flaky detection is heuristic; state the evidence for each verdict.
- GitHub Actions only for v1; other CI providers out of scope.
