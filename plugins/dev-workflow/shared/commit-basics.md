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

Run the deterministic detector instead of applying the rules by hand:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-scope --json true
```

Output:

```json
{ "scopes": ["dev-workflow"], "suggested": "dev-workflow", "source": "files" }
```

- `suggested` is the ready-to-use scope string. Use it verbatim after `type(...)`. When it is `null`, omit the scope.
- `source` is `files` (derived from staged paths), `branch` (fallback), or `none`.
- `scopes` is the full deduped list if you need to inspect it.

Rules the detector applies (for reference — no need to re-implement):

- `apps/{X}/...` → `X`
- `packages/{X}/...` and `plugins/{X}/...` → short name from that package's `package.json` (falls back to `X` if unreadable)
- 2 scopes → joined by `,`
- 3+ scopes → `suggested` is `null` (omit scope)
- No workspace files → falls back to the current branch: strips known prefixes (`feature/`, `fix/`, `chore/`, `task/`, …), preserves `PROJ-123`-style task IDs, otherwise takes the first hyphen-separated word. Excludes `main`/`master`/`develop`/`dev`/`trunk`.

You can override the inputs with `--files a,b,c` and `--branch name` if you need to dry-run against a hypothetical set.

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

Run the deterministic scanner over staged changes instead of eyeballing patterns:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" scan-secrets --json true
```

Exit codes:

- `0` — clean, proceed
- `1` — findings detected; show them to the user and require explicit confirmation before committing
- `2` — scanner error (not a git repo, git unavailable); report and stop

The scanner covers:

- **Sensitive filenames**: `.env*`, `credentials.json`, `secrets.json`, `*.pem`/`*.key`/`*.crt`/`*.p12`/`*.pfx`, SSH keys (`id_rsa*`, `id_ed25519*`, `id_dsa*`, `id_ecdsa*`), `.npmrc`/`.yarnrc`, any filename containing `api_key`/`secret`/`password`/`passwd`.
- **Content patterns in added lines**: Stripe keys (`sk_live_`, `rk_live_`), Google API keys (`AIza…`), GitHub tokens (`ghp_`/`ghs_`/`gho_`/`ghu_`/`ghr_`), npm tokens (`npm_`), AWS access keys (`AKIA…`/`ASIA…`), Slack tokens (`xox[abprs]-…`), PEM private-key blocks, DB connection strings with credentials, and hardcoded password assignments.

When any finding appears, surface the file + line + pattern name to the user verbatim. Do NOT proceed until they explicitly confirm (or they unstage/redact).

## Error Handling

- **Hook failures**: show output, ask before `--no-verify` — NEVER skip hooks without permission
- **Merge conflicts**: report conflicting files, suggest resolution first, do NOT auto-resolve
