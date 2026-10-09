---
name: ci-triage
argument-hint: [run URL or PR number]
description: Explains why a CI run is red and what to do about each failure. Use when the user says "why is CI red", "triage CI", "CI failed", "is this test flaky", or pastes a GitHub Actions run URL. Not for reviewing code (use review-pr).
allowed-tools: Read, Grep, Bash(gh:*), Bash(git:*), Bash(command:*)
model: sonnet
effort: medium
---

# CI Triage

Explain a red CI run: classify every failure as real, flaky or infra, and recommend one action each.

Read `${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md` first.

## Arguments

`$ARGUMENTS` (optional):

- `/ci-triage` — latest failed run on the current branch
- `/ci-triage 123` — PR number (its latest failed run)
- `/ci-triage <url>` — run URL

## Prerequisites

`command -v gh` → `gh auth status` → `gh repo view`. If any fails, tell the user (install `gh` or run `gh auth login`) and stop.

Done when: all three commands exit 0.

## Workflow

### 1. Resolve the run

- URL → take the run id from it.
- PR number → `gh pr view <n> --json headRefName -q .headRefName`, then use that branch below.
- Nothing → `git branch --show-current`.

```bash
gh run list --branch <branch> --status failure --limit 1 --json databaseId,workflowName,headSha,url
```

No failed run found → say so and stop.

Done when: one run id is named.

### 2. Fetch failing jobs and logs

```bash
gh run view <id> --json jobs
gh run view <id> --log-failed
```

Keep only failing jobs and their failing steps. Trim each log to the error lines plus ~10 lines of context.

Done when: every failing step has a trimmed log excerpt.

### 3. Classify each failure

Give every failure a class and the evidence behind it.

- **real** — error points at `file:line`; name the most likely commit (`git log -3 --format='%h %s' -- <file>`, compare with the PR diff).
- **flaky** — the same test or job passed on the base branch or in recent history:
  `gh run list --workflow <name> --branch <base> --limit 10 --json conclusion,headSha`
- **infra** — runner, network, registry, secrets or outage signatures (`ECONNRESET`, `429`, `503`, "runner lost", "No space left", expired token).

Not enough evidence → say "unclear" and name what would settle it.

Done when: every failure has a class (or "unclear") and one line of evidence.

### 4. Recommend one action per failure

- real → fix pointer (`file:line` + what to change)
- flaky or infra → `gh run rerun <id> --failed`
- flaky test seen more than once → one GitHub issue per test. Dedupe first:
  `gh issue list --state open --search "<test name>" --json number,title`
  Existing issue → link it instead of creating a new one.

Done when: every failure has exactly one action.

### 5. Report, then ask

```
CI triage: <workflow> #<run id> on <branch>

| Job / step | Class | Evidence | Action |
|:-----------|:------|:---------|:-------|

Proposed: rerun failed jobs · open N issues (titles below)
```

This skill is read-only until here. Ask before any rerun or issue creation, following `github-posting.md`, and run only what the user approves.

Done when: the user has approved or declined each proposed action.

## Errors

- **Logs expired or unavailable** → classify from job metadata, mark confidence low
- **Rate limited** → wait or use a PAT
