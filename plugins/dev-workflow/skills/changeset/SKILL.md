---
name: changeset
argument-hint: [commit message]
description: Generate changeset for modified packages and create git commit
model: sonnet
---

Generate changesets for modified packages and commit following Conventional Commits. CI applies changesets and publishes automatically.

## Usage

- `/changeset` - Interactive mode
- `/changeset "feat: add feature"` - Direct with message
- `/changeset "feat(scope): description"` - With scope

## 0. Validate Project Structure

1. **Monorepo?** Check for `packages/` directory
2. **Changesets configured?** Check for `.changeset/` directory
3. **Git repo?** Check for `.git/` directory

**IMPORTANT**: Do NOT run `changeset version` locally — CI handles versioning and publishing.

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
- Unstaged exist → inform (excluded from commit)

## 3. Detect Modified Packages

```bash
git diff --staged --name-only | grep '^packages/' | cut -d'/' -f2 | sort -u
```

For nested structures, walk up to find `package.json`. Read each to get package name. Skip private packages.

## 4. Determine Change Type

| Type | Bump | Indicators |
|------|------|------------|
| Breaking change | `major` | API changes, removed exports, renamed functions |
| New feature | `minor` | New exports, new optional params, new functionality |
| Bug fix/improvement | `patch` | Fixes, internal refactoring, docs |

Default to `patch`.

## 5. Generate Changeset File

**Location**: `.changeset/<adjective-noun-verb>.md`

```markdown
---
"@scope/package-name": patch
---

Brief description of what changed and why.
```

**Name generator** — combine: (brave|calm|cool|fast|happy|kind|loud|nice|quick|warm|wild|wise)-(ants|bees|cats|dogs|eels|fish|goats|hawks|jays|lions)-(dance|fly|grow|hide|jump|kick|leap|march|play|rest|sing|walk)

## 6. Draft Commit Message

If not provided via argument:

1. Analyze changes semantically
2. Type: feat, fix, refactor, perf, test, docs, chore, ci, build
3. Scope: single package → short name; `apps/xxx/` → xxx; 3+ packages → omit
4. Description: imperative mood, lowercase, no period, max 72 chars
5. Show for user approval

## 7. Commit Format

```text
type(scope): description
```

## 8. Create Commit

1. Stage changeset: `git add .changeset/*.md`
2. Commit with HEREDOC
3. Verify: `git log -1 --oneline` + `git status`

## Security

**NEVER commit**: `.env*`, `credentials.json`, `secrets.json`, `*.pem`, `*.key`, files with API_KEY/SECRET/PASSWORD in name. Warn and require confirmation if user insists.

## Error Handling

- **Hook failures**: Show output, ask before `--no-verify`
- **Merge conflicts**: Report files, suggest resolve first
