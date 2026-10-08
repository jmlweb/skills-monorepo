---
name: review-pr
argument-hint: [PR number or URL] [--all]
description: Review a GitHub pull request with specialized agents running in parallel (code quality, security, QA, architecture as needed). Use when the user says "review PR", "review this pull request", "/review-pr", pastes a GitHub PR URL, or finishes a branch and wants feedback before merge. Fetches diff via `gh`, checks CI status, produces a structured report with risk matrix and merge recommendation. Requires GitHub CLI authenticated.
allowed-tools: Read, Write, Grep, Agent, Bash(gh:*), Bash(git:*), Bash(command:*)
model: sonnet
effort: medium
---

Review a pull request by dispatching specialized agents in parallel and aggregating their findings into a single structured report.

## Usage

- `/review-pr` — current branch's PR
- `/review-pr 123` — by number
- `/review-pr <url>` — by full GitHub URL
- `--all` — also show Nice to Have and Info findings (default shows Critical, Must Fix, Should Fix)

## 1. Prerequisites

`command -v gh` → `gh auth status` → `gh repo view`. If the PR is a draft or already merged, warn and ask before continuing.

## 2. Fetch PR

Resolve the PR from argument, current branch (`gh pr view`), or ask. Then:

```bash
gh pr view <id> --json number,title,author,headRefName,baseRefName,state,isDraft,mergeable,url,additions,deletions,files
gh pr diff <id>
gh pr checks <id>
```

Run those in parallel. Checkout the branch only if local inspection is needed and you are not already on it.

## 3. Size & categorize

From the diff stats, classify:

- **Size**: Small (<50 lines / 1 file), Medium (50–200 / 2–5), Large (200–500 / 6–15), XLarge (>500 or >15)
- **Areas touched**: frontend / backend / infra / docs / tests / config

For XLarge, suggest splitting before reviewing in depth.

## 4. Dispatch reviewers (parallel)

Always run **code-reviewer** (haiku): conventions, types, exports, error handling, naming.

Conditionally add, based on the diff:

- **security-reviewer** (sonnet) — auth/authorization, sensitive data, env vars, DB queries, file uploads, payments, CORS/CSP. Apply OWASP Top 10.
- **qa-engineer** (haiku) — new user-facing flows, API endpoints, UI changes that need integration/E2E coverage.
- **frontend-architect** (sonnet) — new app structure or state-management migration.
- **backend-architect** (sonnet) — new service architecture or schema overhaul.

Each agent applies the relevant section of `${CLAUDE_PLUGIN_ROOT}/skills/review-pr/assets/checklists.md` and returns findings in its `Finding format` — paste both into the agent's prompt (subagents don't inherit this skill's context). Format: one line per finding, `path:line: <severity>: <finding>`, severity one of Critical, Must Fix, Should Fix, Nice to Have, Info. If an agent fails, continue with the rest and note the gap.

## 5. Aggregate

1. Collect every agent's finding lines and number them globally in order, `#1`, `#2`, … (numbers stay stable across agents and filters).
2. Fill `${CLAUDE_PLUGIN_ROOT}/skills/review-pr/assets/report-template.md` with all findings, the CI check result, and the risk matrix. Keep finding text verbatim. Write the full, unfiltered report to `review.md` in the current directory (temporary — do not commit it).
3. Show the user the findings filtered to Critical, Must Fix and Should Fix; with `--all`, include Nice to Have and Info. Tell the user the full report is in `review.md`.

CI: ✅ all green → proceed. ⏳ pending → note. ❌ failed → flag as merge blocker.

## 6. Post

1. Ask the user which finding numbers to post (or none), and the verdict: approve / request changes / comment / show again.
2. Print the exact review that will be posted: verdict, summary body, and each selected `path:line` comment. Wait for an explicit go-ahead; edit and re-show on request.
3. Post one review with the PR head SHA (`gh pr view <id> --json headRefOid`):

```bash
gh api repos/{owner}/{repo}/pulls/<n>/reviews --method POST --input - <<'JSON'
{"commit_id":"<head sha>","event":"APPROVE|REQUEST_CHANGES|COMMENT","body":"<summary>",
 "comments":[{"path":"<path>","line":<line>,"side":"RIGHT","body":"<one-line finding>"}]}
JSON
```

4. On HTTP 422 (line not in the diff), move the failing findings into `body` as `path:line: <finding>` bullets and repost. Done when the API returns the review URL.

## Errors

- **PR not found** → re-check id, repo access, `gh auth status`
- **`gh` missing** → tell the user to install it (don't list per-OS commands)
- **Rate limited** → wait or use a PAT
