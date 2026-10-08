---
name: open-pr
argument-hint: [--template <path>] [--ready] [--base <branch>]
description: Turns the current branch into a GitHub pull request with a human-first description written from the repo's PR template. Scans the branch for secrets, resolves the template, drafts title and body with the pr-writer agent, shows them for approval, then pushes and runs gh pr create as a draft. Use when the user says "open a PR", "create a pull request", "open-pr", "/open-pr", "make a PR for this branch", or "submit this branch". Not for an existing PR (use pr-ready) and not for committing (use commit). Requires GitHub CLI authenticated.
allowed-tools: Read, Agent, Bash(git:*), Bash(gh:*), Bash(node:*)
model: sonnet
effort: medium
---

# Open PR

Create a pull request from the current branch. The description is written for humans: why first, scannable, shaped by the repo's own template.

Read `${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md` first. Every push and PR creation below follows it.

## Arguments

`$ARGUMENTS` (optional):

- `--template <path>` — use this template file instead of resolving one
- `--ready` — create a regular PR instead of a draft
- `--base <branch>` — target branch; default is the repo's default branch

## Prerequisites

`command -v gh` → `gh auth status` → `gh repo view`. Stop with a clear message if any fails.

## Workflow

### 1. Preflight

- Base: `--base`, else `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Then `git fetch origin <base>`.
- Current branch (`git rev-parse --abbrev-ref HEAD`) equals the base or is `HEAD` (detached) → stop.
- `git status --porcelain` not empty → warn that uncommitted changes will not be in the PR; ask whether to continue (suggest `/dev-workflow:commit`).
- `git rev-list --count origin/<base>..HEAD` is 0 → stop, nothing to open.
- `gh pr list --head <branch> --state open --json number,url` not empty → stop and point to `/dev-workflow:pr-ready` with that URL.

### 2. Scan for secrets

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" scan-secrets --range origin/<base>...HEAD --json true
```

Any finding → list `file:line` and pattern, stop. Nothing is pushed until the user removes the secret from the branch history and re-runs.

### 3. Resolve template and scope

- `--template <path>` given → use it; else:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" find-pr-template --user-dir "${CLAUDE_PLUGIN_DATA}" --json true
```

- `path` null (several repo templates) → ask which of `candidates`, one concrete question.
- Read the chosen file. Tell the user which source was used (`repo`, `user` or `builtin`).

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-scope --range origin/<base>...HEAD --json true
```

Use `suggested` as the title scope; none → no scope.

### 4. Gather inputs and write

Collect: `git log --format='%h %s%n%b' origin/<base>..HEAD`, `git diff --stat origin/<base>...HEAD`, hunks of the riskiest files (`git diff --unified=3 origin/<base>...HEAD -- <file>`; cap at a few files), and a ticket id (`TSK-123`, `ABC-123`) from the branch name or commits.

Invoke the `Agent` tool with `subagent_type: "dev-workflow:pr-writer"` and a prompt carrying the template text, commit log, diff stat, hunks, suggested scope and ticket. Agents only, never a skill as `subagent_type`.

Reply starts with `MISSING:` → fix the input and retry once. Otherwise split at the `---` line into title and body.

### 5. Approve

Show the title, the body, base → head, and draft or ready. Ask: **create**, **edit** (apply the user's changes, show again) or **cancel**. Never continue without an explicit yes.

### 6. Push and create

Only after approval:

```bash
git push -u origin <branch>
gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file - <<'EOF'
<body>
EOF
```

- `--ready` → omit `--draft`.
- Plain push only, never force. Push rejected → report and stop.

### 7. Report

```
PR #<n> — <title>
<url>
State: draft (or ready) · Base: <base> · Template: <repo|user|builtin>
Next: /dev-workflow:pr-ready when CI and reviews need driving
```

State that the PR was created as a draft unless `--ready` was used.

## Errors

- **`gh` missing or unauthenticated** → tell the user to install or run `gh auth login`
- **Push fails** → report the git message; create nothing
- **`gh pr create` fails after push** → report; the branch is already pushed, nothing else changed
