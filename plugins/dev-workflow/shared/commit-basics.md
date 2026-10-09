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
- Show the drafted message to the user and commit after approval

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

Detector behaviour worth knowing: 2 scopes join with `,`; 3+ scopes give `suggested: null`; without workspace files it falls back to the branch name (task IDs like `PROJ-123` preserved). For plugins the scope is the directory name, which can differ from the package name.

Dry-run against a hypothetical set with `--files a,b,c` and `--branch name`.

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

The scanner checks sensitive filenames (`.env*`, keys, certificates, credentials files) and credential patterns in added lines (cloud, Git host and payment tokens, private-key blocks, connection strings, hardcoded passwords).

On any finding, surface file + line + pattern name to the user verbatim. Commit only after they confirm explicitly or unstage/redact the content.

## Error Handling

- **Hook failures**: show the output and fix the cause, then retry the commit. Ask before `--no-verify`; a skipped hook hides a real failure.
- **Merge conflicts**: report the conflicting files and let the user resolve them first
