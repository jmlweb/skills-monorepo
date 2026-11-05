---
name: open-pr
argument-hint: [--template <path>] [--ready] [--base <branch>]
description: Opens the current branch as a draft GitHub pull request with a human-first description. Use when the user says "open a PR", "create a pull request", "open-pr", "make a PR for this branch", or "submit this branch". Not for an existing PR (use pr-ready) or committing (use commit).
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

`command -v gh` → `gh auth status` → `gh repo view`. If any fails, tell the user (install `gh` or run `gh auth login`) and stop.

Done when: all three commands exit 0.

## Workflow

### 1. Preflight

- Base: `--base`, else `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Then `git fetch origin <base>`.
- Current branch (`git rev-parse --abbrev-ref HEAD`) equals the base or is `HEAD` (detached) → stop.
- `git status --porcelain` not empty → warn that uncommitted changes will not be in the PR; ask whether to continue (suggest `/dev-workflow:commit`).
- `git rev-list --count origin/<base>..HEAD` is 0 → stop, nothing to open.
- `gh pr list --head <branch> --state open --json number,url` not empty → stop and point to `/dev-workflow:pr-ready` with that URL.

Done when: base and branch are named and every check above passed.

### 2. Scan for secrets

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" scan-secrets --range origin/<base>...HEAD --json true
```

Any finding → list `file:line` and pattern, stop. The user removes the secret from the branch history and re-runs; the push waits for that.

Done when: the scan exits 0.

### 3. Review the diff

Dispatch `code-reviewer` (unavailable → `general-purpose`, same prompt) with `git diff origin/<base>...HEAD`, the `Finding format` and `Code Quality` sections of `${CLAUDE_PLUGIN_ROOT}/skills/review-pr/assets/checklists.md`, and the full `${CLAUDE_PLUGIN_ROOT}/skills/review-pr/assets/smells.md` pasted into the prompt (subagents don't inherit this skill's context). When the diff touches auth, env vars, payments or DB queries, also dispatch `security-reviewer` in parallel with the `Security` section. An agent that fails is noted as a gap; the run continues.

Keep the Critical, Must Fix and Should Fix lines for step 6. Findings are for the user only: never pass them to `pr-writer` or put them in the PR body.

Done when: every dispatched reviewer returned findings or a noted gap.

### 4. Resolve template and scope

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

Done when: a template is read and its source is named.

### 5. Gather inputs and write

Collect: `git log --format='%h %s%n%b' origin/<base>..HEAD`, `git diff --stat origin/<base>...HEAD`, hunks of at most 5 files: the riskiest, spread across the areas the diff stat touches (`git diff --unified=3 origin/<base>...HEAD -- <file>`), and a ticket id (`TSK-123`, `ABC-123`) from the branch name or commits.

Invoke the `Agent` tool with `subagent_type: "dev-workflow:pr-writer"` and a prompt carrying the template text, commit log, diff stat, hunks, suggested scope and ticket.

Reply starts with `MISSING:` → fix the input and retry once. Otherwise split at the `---` line into title and body.

Done when: a title and a body exist.

### 6. Approve

Show the review findings from step 3 (or "no findings"), then the title, the body, base → head, and draft or ready. Ask: **fix first** (stop so the user fixes and re-runs), **create**, **edit** (apply the user's changes, show again) or **cancel**. Any Critical or Must Fix finding → offer **fix first** as the recommended option. Continue only on an explicit yes.

Done when: the user answered fix first, create or cancel.

### 7. Push and create

Only after approval:

```bash
git push -u origin <branch>
gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file - <<'EOF'
<body>
EOF
```

Push plainly to the feature branch only; a rejected push is reported and the run stops.

- `--ready` → omit `--draft`.
- Push rejected → report and stop.

Done when: `gh pr create` prints the PR URL.

### 8. Report

```
PR #<n> — <title>
<url>
State: draft (or ready) · Base: <base> · Template: <repo|user|builtin>
Next: /dev-workflow:pr-ready when CI and reviews need driving
```

Done when: the block is printed with the URL from step 7.

## Errors

- **Push fails** → report the git message; create nothing
- **`gh pr create` fails after push** → report; the branch is already pushed, nothing else changed
