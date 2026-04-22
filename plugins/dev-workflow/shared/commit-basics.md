# Commit Basics (shared by `/commit` and `/changeset`)

Shared rules for any skill that creates a git commit in this plugin.

## Pre-commit Analysis

```bash
git status
git diff --staged
git diff
git log -1 --format='%s'
```

## Validate Staged Changes

- Has staged → proceed
- No staged → ask to stage all
- Unstaged exist → inform the user (they are excluded from this commit)

## Conventional Commits Format

```text
type(scope): description

Optional body.
```

Rules for the description:

- Imperative mood, lowercase, no trailing period
- Max 72 chars
- Show the drafted message to the user for approval before committing

### Commit Type Reference

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

### Scope Detection

- `apps/{name}/` → `{name}`
- `packages/{name}/` → short package name from `package.json`
- Branch `feature/auth-flow` → `auth`
- 3+ scopes → omit scope
- 2 scopes → pick the most significant or list both

## Commit Execution (HEREDOC)

```bash
git commit -m "$(cat <<'EOF'
type(scope): description
EOF
)"
```

Then verify:

```bash
git log -1 --oneline
git status
```

## Security

**NEVER commit**: `.env*`, `credentials.json`, `secrets.json`, `*.pem`, `*.key`, `*.crt`, SSH keys (`id_rsa*`, `id_ed25519*`), `.npmrc`/`.yarnrc` (may contain tokens), any file with `API_KEY`, `SECRET`, or `PASSWORD` in the name.

**Scan staged content for**: `sk_live_`, `AIza`, `ghp_`, `npm_`, hardcoded passwords and connection strings.

If a flagged file is staged, warn the user and require explicit confirmation before committing.

## Error Handling

- **Hook failures**: show output, ask before `--no-verify` — NEVER skip hooks without permission
- **Merge conflicts**: report conflicting files, suggest resolution first, do NOT auto-resolve
