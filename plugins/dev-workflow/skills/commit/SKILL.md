---
name: commit
argument-hint: [commit message]
description: Create a git commit following Conventional Commits. Use when the user says "commit", "commit these changes", has finished a logical unit of work, or wants to save progress to git. Analyzes the staged diff to infer type/scope, scans for secrets and sensitive files, warns before committing to main/master, and never bypasses hooks without permission.
allowed-tools: Read, Grep, Bash(git:*), Bash(test:*)
model: sonnet
---

Automate git commits with Conventional Commits format and security validation.

Shared rules (pre-commit analysis, staged validation, Conventional Commits format + type table, scope detection, security scan, error handling) live in `../../shared/commit-basics.md`. Read that file at the start of the run and follow it.

## Usage

- `/commit` — Interactive mode (analyze changes, suggest message)
- `/commit "feat: add feature"` — Direct commit
- `/commit "feat(scope): description"` — With scope

## 0. Validate Environment

1. **Git repo?** `git rev-parse --git-dir`
2. **No merge/rebase in progress?** `.git/MERGE_HEAD` and `.git/rebase-merge` must not exist
3. **On `main`/`master`?** Warn before committing

## 1. Pre-commit Analysis

Follow `shared/commit-basics.md` → *Pre-commit Analysis* and *Validate Staged Changes*.

## 2. Draft Commit Message

If not provided as argument:

1. Analyze the staged diff semantically
2. Pick a type from the table in `shared/commit-basics.md`
3. Infer scope using the rules in `shared/commit-basics.md` → *Scope Detection*
4. Write the description (imperative, lowercase, no period, ≤72 chars)
5. Show the full drafted message to the user for approval

## 3. Execute

Commit using the HEREDOC pattern from `shared/commit-basics.md` → *Commit Execution*, then verify with `git log -1 --oneline` and `git status`.

## Security & Error Handling

See `shared/commit-basics.md` → *Security* and *Error Handling*.

## Task Integration

If the project uses task IDs, detect one from the branch name (`task/TASK-042`), modified files, or the argument, and use it as the scope.
