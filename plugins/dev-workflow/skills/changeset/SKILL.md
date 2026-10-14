---
name: changeset
argument-hint: [commit message]
description: Records a package version bump as a Changesets entry and commits it, for Changesets-managed monorepos. Use when the user says "changeset", "add changeset", "record a version bump", or "this should ship in the next release". Not for single-package repos or repos without a `.changeset/` directory (use commit).
allowed-tools: Read, Write, Grep, Bash(git:*), Bash(test:*)
model: sonnet
effort: medium
---

# Changeset

Generate a Changesets entry for the modified packages and commit it. CI runs `changeset version` and publishes; local runs would duplicate its bump.

Read `${CLAUDE_PLUGIN_ROOT}/shared/commit-basics.md` first; it owns the pre-commit analysis, staged validation, Conventional Commits format, scope detection, secret scan, and error handling.

## Arguments

`$ARGUMENTS` (optional): the full commit message.

- `/changeset` — interactive
- `/changeset "feat: add feature"` — direct
- `/changeset "feat(scope): description"` — with scope

## Prerequisites

`test -d packages && test -d .changeset && test -d .git`. Any missing → tell the user this repo is not Changesets-managed, suggest `/dev-workflow:commit`, and stop.

Done when: all three directories exist.

## Workflow

### 1. Pre-commit analysis

Follow `commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*.

Done when: staged changes exist.

### 2. Detect modified packages

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-packages --json true
```

Returns `{ packages: [{ name, shortName, private, dir }, …] }`. Private packages are filtered out by default (`--include-private true` to include them). Empty list → nothing to version, stop.

Done when: the package list is non-empty.

### 3. Pick the bump

| Bump | When |
|------|------|
| `major` | breaking API change, removed/renamed exports |
| `minor` | new exports, new optional params, new functionality |
| `patch` | bug fix, internal refactor, docs |

Default to `patch`.

Done when: each package has one bump.

### 4. Write the changeset

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

Done when: the file exists at the printed path.

### 5. Commit

If no message was provided, draft one per `commit-basics.md` → *Conventional Commits Format* + *Scope Detection*. Changeset-specific scope rules: single package → its short name; `apps/xxx/` → `xxx`; 3+ packages → omit scope. Show the message and wait for approval.

1. `git add .changeset/*.md`
2. Run the secret scan from `commit-basics.md` → *Security*; handle findings per its *Error Handling*
3. Commit with the HEREDOC pattern from `commit-basics.md` → *Commit Execution*
4. Verify with `git log -1 --oneline` and `git status`

Done when: `git log -1` shows the new commit and the changeset file is no longer in `git status`.

### 6. Confirm

```
Changeset <path>: <package> <bump>
Committed <hash>: <message>
```

Done when: the block is printed.
