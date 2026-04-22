---
name: changeset
argument-hint: [commit message]
description: Generate a Changesets entry and commit it, for Changesets-managed monorepos. Use when the user says "changeset", "add changeset", needs to record a package version bump, or finishes work that should ship in the next release. Detects modified packages from staged files, picks major/minor/patch from the diff, and leaves `changeset version` to CI. Do NOT use for single-package repos or repos without a `.changeset/` directory.
allowed-tools: Read, Write, Grep, Bash(git:*), Bash(test:*)
model: sonnet
---

Generate a Changesets entry for modified packages and commit it following Conventional Commits. CI applies changesets and publishes automatically.

Shared rules (pre-commit analysis, staged validation, Conventional Commits format + type table, scope detection, security scan, error handling) live in `../../shared/commit-basics.md`. Read that file at the start of the run and follow it.

## Usage

- `/changeset` — Interactive mode
- `/changeset "feat: add feature"` — Direct with message
- `/changeset "feat(scope): description"` — With scope

## 0. Validate Project Structure

1. **Monorepo?** Check for a `packages/` directory
2. **Changesets configured?** Check for `.changeset/`
3. **Git repo?** Check for `.git/`

**IMPORTANT**: Do NOT run `changeset version` locally — CI handles versioning and publishing.

## 1. Pre-commit Analysis

Follow `shared/commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*.

## 2. Detect Modified Packages

Use the deterministic CLI instead of parsing `git diff` by hand:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-packages --json true
```

Returns `{ packages: [{ name, shortName, private, dir }, …] }`. Private packages are filtered out by default; pass `--include-private true` if you ever need them. If the returned list is empty, stop — there is nothing to version.

## 3. Determine Change Type

| Type | Bump | Indicators |
|------|------|------------|
| Breaking change | `major` | API changes, removed exports, renamed functions |
| New feature | `minor` | New exports, new optional params, new functionality |
| Bug fix / improvement | `patch` | Fixes, internal refactoring, docs |

Default to `patch`.

## 4. Generate Changeset File

Get an unused filename from the CLI (it checks `.changeset/` for collisions):

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" changeset-name
```

Prints the full relative path, e.g. `.changeset/brave-cats-dance.md`. Use `--json true` if you need structured output, or `--dir <path>` to target a non-standard directory.

Write the file with the frontmatter and description:

```markdown
---
"@scope/package-name": patch
---

Brief description of what changed and why.
```

## 5. Draft Commit Message

If not provided as argument, follow `shared/commit-basics.md` → *Conventional Commits Format* + *Scope Detection*. For changesets specifically: single package → its short name as scope; `apps/xxx/` → `xxx`; 3+ packages → omit scope.

## 6. Create Commit

1. Stage the changeset: `git add .changeset/*.md`
2. Commit using the HEREDOC pattern from `shared/commit-basics.md` → *Commit Execution*
3. Verify with `git log -1 --oneline` and `git status`

## Security & Error Handling

See `shared/commit-basics.md` → *Security* and *Error Handling*.
