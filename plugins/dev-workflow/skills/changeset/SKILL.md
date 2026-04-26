---
name: changeset
argument-hint: [commit message]
description: Generate a Changesets entry and commit it, for Changesets-managed monorepos. Use when the user says "changeset", "add changeset", needs to record a package version bump, or finishes work that should ship in the next release. Detects modified packages from staged files, picks major/minor/patch from the diff, and leaves `changeset version` to CI. Do NOT use for single-package repos or repos without a `.changeset/` directory.
allowed-tools: Read, Write, Grep, Bash(git:*), Bash(test:*)
model: sonnet
effort: medium
---

Generate a Changesets entry for the modified packages and commit it. CI applies changesets and publishes — never run `changeset version` locally.

Read `../../shared/commit-basics.md` first; it owns the pre-commit analysis, staged validation, Conventional Commits format, scope detection, secret scan, and error handling. Don't re-implement those rules here.

## Usage

- `/changeset` — interactive
- `/changeset "feat: add feature"` — direct
- `/changeset "feat(scope): description"` — with scope

## 1. Validate project

`packages/` exists, `.changeset/` exists, `.git/` exists. Otherwise stop.

## 2. Pre-commit analysis

Follow `commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*.

## 3. Detect modified packages

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-packages --json true
```

Returns `{ packages: [{ name, shortName, private, dir }, …] }`. Private packages are filtered out by default (`--include-private true` to include them). Empty list → nothing to version, stop.

## 4. Pick the bump

| Bump | When |
|------|------|
| `major` | breaking API change, removed/renamed exports |
| `minor` | new exports, new optional params, new functionality |
| `patch` | bug fix, internal refactor, docs |

Default to `patch`.

## 5. Write the changeset

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" changeset-name
```

Prints a collision-free path like `.changeset/brave-cats-dance.md`. Write:

```markdown
---
"@scope/package-name": patch
---

Brief description of what changed and why.
```

## 6. Commit

If no message was provided, draft one per `commit-basics.md` → *Conventional Commits Format* + *Scope Detection*. Changeset-specific scope rules: single package → its short name; `apps/xxx/` → `xxx`; 3+ packages → omit scope.

1. `git add .changeset/*.md`
2. Commit with the HEREDOC pattern from `commit-basics.md` → *Commit Execution*
3. Verify with `git log -1 --oneline` and `git status`

Security and error handling: see `commit-basics.md` → *Security* and *Error Handling*.
