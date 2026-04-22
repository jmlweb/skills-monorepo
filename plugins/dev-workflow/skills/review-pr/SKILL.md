---
name: review-pr
argument-hint: [PR number or URL]
description: Comprehensive PR review using specialized agents
model: sonnet
---

Perform comprehensive pull request review using parallel specialized agents.

## Usage

- `/review-pr` - Review current branch's PR
- `/review-pr 123` - Review PR by number
- `/review-pr https://github.com/owner/repo/pull/123` - Review PR by URL

## 0. Validate Prerequisites

1. **GitHub CLI installed?** `command -v gh`
2. **Authenticated?** `gh auth status`
3. **Repository access?** `gh repo view`
4. **PR exists?** Check state (not draft, not merged). If draft, warn and ask.

## 1. Fetch PR Details

Detect PR from: argument (number/URL), current branch (`gh pr view`), or ask user.

```bash
gh pr view 123 --json number,title,author,headRefName,baseRefName,state,isDraft,mergeable,url
gh pr checkout 123  # Only if not already on PR branch
```

## 2. Analyze PR Scope

Run in parallel:

```bash
gh pr diff 123
gh pr view 123 --json files
git diff origin/main...HEAD --stat
```

**Categorize**: Frontend, Backend, Infrastructure, Documentation, Tests, Configuration.

**Complexity**: Small (<50 lines, 1 file), Medium (50-200 lines, 2-5 files), Large (200-500 lines, 6-15 files), XLarge (>500 lines or >15 files).

## 3. Launch Parallel Reviews

### Always Run

**code-reviewer** (haiku): Code quality, project conventions, TypeScript strictness, named exports, functional approach, error handling.

### Conditional Agents

**security-reviewer** (sonnet) — if auth/authorization, sensitive data APIs, env vars, DB queries, file uploads, payment logic, CORS/CSP:
- OWASP Top 10, injection, XSS, CSRF, auth flaws, secrets exposure, input validation, rate limiting
- Severity: 🔴 Critical, 🟡 Medium, 🟢 Low

**qa-engineer** (haiku) — if critical user flows, new features needing E2E, UI changes, API endpoints needing integration tests:
- Unit test coverage, integration tests, E2E needs, edge cases

**frontend-architect** (sonnet) — only for new app structure or state management migration.

**backend-architect** (sonnet) — only for new service architecture or major schema overhaul.

## 4. Check CI Status

```bash
gh pr checks 123
```

✅ All passed → proceed. ⏳ Pending → note. ❌ Failed → block merge.

## 5. Aggregate Reviews

### Report Template

```markdown
# PR Review: #{number} - {title}

**Author**: @{author}
**Branch**: `{headRefName}` → `{baseRefName}`
**Status**: {state} | **Mergeable**: {mergeable}
**Size**: {complexity} ({files} files, +{additions}/-{deletions} lines)

---

## Summary
{One paragraph overview}

## Risk Assessment
**Overall Risk**: 🟢 Low | 🟡 Medium | 🔴 High

| Area | Risk | Reasoning |
|------|------|-----------|
| Security | {icon} | {summary} |
| Quality | {icon} | {summary} |
| Tests | {icon} | {summary} |
| Perf | {icon} | {summary} |

## Code Review
{code-reviewer output}

## Security Review
{security-reviewer output if applicable}

## Test Coverage
{qa-engineer output if applicable}

## Architecture
{architect outputs if applicable}

## CI Checks
| Check | Status |
|-------|--------|

## Recommendations

### 🔴 Critical (blocks merge)
### 🟠 Must Fix (blocks merge)
### 🟡 Should Fix (before merge recommended)
### 🟢 Nice to Have (follow-up)
### ℹ️ Info (no action needed)

## Decision
- [ ] ✅ **Approve**
- [ ] 🔄 **Request Changes**
- [ ] 💬 **Comment**
```

## 6. Post Review Actions

Ask user: Approve / Request changes / Add comment / Show again.

```bash
gh pr review 123 --approve --body "$(cat review.md)"
gh pr review 123 --request-changes --body "$(cat review.md)"
gh pr review 123 --comment --body "$(cat review.md)"
```

## Review Checklists

### Code Quality
- Project conventions (AGENTS.md, CLAUDE.md), named exports, functional approach
- TypeScript strict, no `any`, proper error handling, no console.log in prod
- Meaningful names, no magic numbers

### Security
- No secrets in code, input validation, auth checks
- SQL/XSS/CSRF prevention, secure dependencies

### Testing
- Unit tests for new logic, integration for APIs, E2E for critical flows
- Edge cases covered, deterministic, ≥80% coverage for new code

### Performance
- No unnecessary re-renders, optimized queries, virtualized lists
- Optimized images, acceptable bundle size, no memory leaks

## Error Handling

- **PR Not Found**: Check number, access, `gh auth status`
- **No GitHub CLI**: Install with `brew install gh` / `sudo apt install gh` / `winget install gh`
- **Large PR (>1000 lines)**: Suggest breaking into smaller PRs
- **Rate Limiting**: Wait 15 min or use PAT for higher limits
- **Agent Failure**: Continue with remaining agents, report gap

## Arguments

- `--files "file1,file2"` — Review only specific files
- `--focus [security|tests|architecture]` — Focus on specific aspect
- `--skip-ci` — Skip CI status check
