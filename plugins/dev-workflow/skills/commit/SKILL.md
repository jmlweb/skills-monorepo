---
name: commit
argument-hint: [commit message]
description: Creates a Conventional Commits commit from the staged changes. Use when the user says "commit", "commit these changes", "save my progress", or "commit what I have". Not for Changesets entries (use changeset) or opening a pull request (use open-pr).
allowed-tools: Read, Grep, Bash(git:*), Bash(test:*)
model: sonnet
effort: medium
---

# Commit

Shared rules (pre-commit analysis, staged validation, Conventional Commits format + type table, scope detection, security scan, error handling) live in `${CLAUDE_PLUGIN_ROOT}/shared/commit-basics.md`. Read that file first and follow it as `commit-basics.md` below.

## Arguments

`$ARGUMENTS` (optional): the full commit message.

- `/commit` — interactive mode (analyze changes, suggest message)
- `/commit "feat: add feature"` — direct commit
- `/commit "feat(scope): description"` — with scope

## Prerequisites

1. **Git repo?** `git rev-parse --git-dir` exits 0
2. **No merge/rebase in progress?** `test ! -e .git/MERGE_HEAD && test ! -d .git/rebase-merge`
3. **On `main`/`master`?** Warn and wait for the user's go-ahead

Done when: the checks pass or the user has answered the warning.

## Workflow

### 1. Pre-commit Analysis

Follow `commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*, then run the secret scan from *Security*.

Done when: staged changes exist and the scan is clean or confirmed by the user.

### 2. Draft Commit Message

When `$ARGUMENTS` holds a message, use it as drafted. Otherwise:

1. Analyze the staged diff semantically
2. Pick a type from the `commit-basics.md` table
3. Take the scope from `commit-basics.md` → *Scope Detection*. When the project uses task IDs, a task ID from the branch name (`task/TASK-042`), modified files or the argument is the scope instead
4. Write the description per the *Conventional Commits Format* rules
5. Show the full drafted message to the user for approval

Done when: the user has approved a message.

### 3. Execute

Commit using the HEREDOC pattern from `commit-basics.md` → *Commit Execution*. Handle hook failures and conflicts per its *Error Handling*.

Done when: `git log -1 --oneline` shows the new commit.

### 4. Confirm

```
Committed <hash>: <message>
```

Done when: the line is printed with the hash from `git log -1 --oneline`.

## Rationalizations

| Thought | Reality |
|---------|---------|
| "The hook is slow, `--no-verify` just this once" | Run the hook; fix what it reports, then retry the commit. |
| "The scan hit a test fixture, skip showing it" | Show every finding verbatim and commit after the user confirms it. |
