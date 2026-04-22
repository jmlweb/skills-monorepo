---
argument-hint: [commit message]
description: Create git commit following Conventional Commits
model: sonnet
---

Automate git commits with Conventional Commits format and security validation.

## Usage

- `/commit` - Interactive mode (analyzes changes, suggests message)
- `/commit "feat: add feature"` - Direct commit
- `/commit "feat(scope): description"` - With scope

## 0. Validate Environment

1. **Git repo?** `git rev-parse --git-dir`
2. **No merge/rebase?** Check `.git/MERGE_HEAD` and `.git/rebase-merge` don't exist
3. **On main/master?** Warn before committing

## 1. Pre-commit Analysis

```bash
git status
git diff --staged
git diff
git log -1 --format='%s'
```

## 2. Validate Staged Changes

- Has staged → proceed
- No staged → ask to stage all
- Unstaged exist → inform (excluded)

## 3. Draft Commit Message

If not provided:

1. Analyze changes semantically
2. Type: feat, fix, refactor, perf, test, docs, chore, ci, build
3. Scope detection:
   - `apps/{name}/` → name
   - `packages/{name}/` → package short name from package.json
   - Branch `feature/auth-flow` → auth
   - 3+ scopes → omit; 2 scopes → most significant or both
4. Description: imperative, lowercase, no period, max 72 chars
5. Show for approval

## 4. Commit Format

```text
type(scope): description

Optional body.

```

## 5. Execute

```bash
git commit -m "$(cat <<'EOF'
type(scope): description
EOF
)"
```

## 6. Verify

```bash
git log -1 --oneline
git status
```

## Security

**NEVER commit**: `.env*`, `credentials.json`, `secrets.json`, `*.pem`, `*.key`, `*.crt`, SSH keys (`id_rsa*`, `id_ed25519*`), `.npmrc`/`.yarnrc` (may contain tokens).

**Scan staged content for**: `sk_live_`, `AIza`, `ghp_`, `npm_`, hardcoded passwords/connection strings.

Warn and require confirmation if user insists on committing flagged files.

## Commit Type Reference

| Type | When | Example |
|------|------|---------|
| feat | New feature | `feat: add OAuth login` |
| fix | Bug fix | `fix: prevent duplicate requests` |
| refactor | No behavior change | `refactor: extract helper` |
| perf | Performance | `perf: memoize calculation` |
| test | Tests | `test: add E2E for checkout` |
| docs | Docs only | `docs: update API examples` |
| chore | Maintenance | `chore: update dependencies` |
| ci | CI/CD | `ci: add coverage reporting` |
| build | Build system | `build: migrate to Vite` |

## Error Handling

- **Hook failures**: Show output, ask before `--no-verify` — NEVER skip without permission
- **Merge conflicts**: Report files, suggest resolve first, DO NOT auto-resolve

## Task Integration

Detect task ID from branch name (`task/TASK-042`), modified files, or argument. Use as scope.
