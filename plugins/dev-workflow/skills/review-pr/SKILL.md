---
name: review-pr
argument-hint: [PR number or URL]
description: Review a GitHub pull request with specialized agents running in parallel (code quality, security, QA, architecture as needed). Use when the user says "review PR", "review this pull request", "/review-pr", pastes a GitHub PR URL, or finishes a branch and wants feedback before merge. Fetches diff via `gh`, checks CI status, produces a structured report with risk matrix and merge recommendation. Requires GitHub CLI authenticated.
allowed-tools: Read, Write, Grep, Task, Bash(gh:*), Bash(git:*), Bash(command:*)
model: sonnet
---

Review a pull request by dispatching specialized agents in parallel and aggregating their findings into a single structured report.

## Usage

- `/review-pr` — current branch's PR
- `/review-pr 123` — by number
- `/review-pr <url>` — by full GitHub URL

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

- **security-reviewer** (sonnet) — auth/authorization, sensitive data, env vars, DB queries, file uploads, payments, CORS/CSP. Apply OWASP Top 10. Severity: 🔴 Critical / 🟡 Medium / 🟢 Low.
- **qa-engineer** (haiku) — new user-facing flows, API endpoints, UI changes that need integration/E2E coverage.
- **frontend-architect** (sonnet) — new app structure or state-management migration.
- **backend-architect** (sonnet) — new service architecture or schema overhaul.

Each agent applies the relevant section of `assets/checklists.md`. If an agent fails, continue with the rest and note the gap.

## 5. Aggregate

Fill `assets/report-template.md` with every agent's output, the CI check result, and the risk matrix. Keep agent outputs verbatim — do not re-summarize their findings.

CI: ✅ all green → proceed. ⏳ pending → note. ❌ failed → flag as merge blocker.

## 6. Post

Ask the user: approve / request changes / comment / show again.

```bash
gh pr review <id> --approve         --body "$(cat review.md)"
gh pr review <id> --request-changes --body "$(cat review.md)"
gh pr review <id> --comment         --body "$(cat review.md)"
```

## Errors

- **PR not found** → re-check id, repo access, `gh auth status`
- **`gh` missing** → tell the user to install it (don't list per-OS commands)
- **Rate limited** → wait or use a PAT
