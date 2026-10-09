---
name: commit
argument-hint: [commit message]
description: Creates a Conventional Commits commit from the staged changes. Use when the user says "commit", "commit these changes", "save my progress", or "commit what I have". Not for Changesets entries (use changeset) or opening a pull request (use open-pr).
allowed-tools: Read, Grep, Bash(git:*), Bash(test:*)
model: sonnet
effort: medium
---

Shared rules (pre-commit analysis, staged validation, Conventional Commits format + type table, scope detection, security scan, error handling) live in `${CLAUDE_PLUGIN_ROOT}/shared/commit-basics.md`. Read that file first and follow it as `commit-basics.md` below.

## Usage

- `/commit` — Interactive mode (analyze changes, suggest message)
- `/commit "feat: add feature"` — Direct commit
- `/commit "feat(scope): description"` — With scope

## 0. Validate Environment

1. **Git repo?** `git rev-parse --git-dir`
2. **No merge/rebase in progress?** `.git/MERGE_HEAD` and `.git/rebase-merge` must not exist
3. **On `main`/`master`?** Warn and wait for the user's go-ahead

Done when: the checks pass or the user has answered the warning.

## 1. Pre-commit Analysis

Follow `commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*, then run the secret scan from *Security*.

Done when: staged changes exist and the scan is clean or confirmed by the user.

## 2. Draft Commit Message

If not provided as argument:

1. Analyze the staged diff semantically
2. Pick a type from the `commit-basics.md` table
3. Take the scope from `commit-basics.md` → *Scope Detection*
4. Write the description per the *Conventional Commits Format* rules
5. Show the full drafted message to the user for approval

Done when: the user has approved a message.

## 3. Execute

Commit using the HEREDOC pattern from `commit-basics.md` → *Commit Execution*. Handle hook failures and conflicts per its *Error Handling*.

Done when: `git log -1 --oneline` shows the new commit.

## Task Integration

If the project uses task IDs, detect one from the branch name (`task/TASK-042`), modified files, or the argument, and use it as the scope.
