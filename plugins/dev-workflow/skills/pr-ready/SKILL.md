---
name: pr-ready
argument-hint: [PR number or URL] [--merge]
description: Drives your open pull request to a mergeable state.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Skill, Agent, Bash(node:*), Bash(gh:*), Bash(git:*), Bash(command:*), Bash(pnpm:*), Bash(npm:*)
model: sonnet
effort: medium
---

# PR Ready

Take the user's own open PR to a mergeable state: branch updated, CI green, review threads handled, lean description, reviewers requested.

Read `${CLAUDE_PLUGIN_ROOT}/shared/github-posting.md` first. Every post, push or merge below follows it.

## Arguments

`$ARGUMENTS` (optional):

- `/pr-ready` — PR of the current branch
- `/pr-ready 123` or `<url>` — a specific PR
- `--merge` — merge at the end. Off by default; never merge without it.

## Prerequisites

`command -v gh` → `gh auth status` → `gh repo view`. Stop with a clear message if any fails.

## Workflow

### 1. Resolve the PR

```bash
gh pr view <id> --json number,title,body,author,headRefName,baseRefName,state,isDraft,url
```

- No argument → current branch's PR. None found → tell the user and stop.
- Current branch equals the base branch → refuse and stop.
- State is not `OPEN` → stop. Author is not the current `gh` user → warn and ask before continuing.
- Not on the PR branch → ask before `gh pr checkout`.

### 2. Update the branch

```bash
git fetch origin <base> && git merge origin/<base>
```

Conflicts → stop, list the files, ask the user. Never resolve silently. Clean merge → ask before `git push` (plain push, never force; never push to the base branch).

### 3. Check CI

```bash
gh pr checks <id>
```

- Pending → note it, continue; re-check at step 9.
- Failed → invoke `dev-workflow:ci-triage` with the Skill tool (never `subagent_type`). Apply its fix pointers; rerun or issue creation stays behind its own confirmations.

### 4. Fetch unresolved review threads

```bash
gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved isOutdated path line comments(first:20){nodes{author{login} body}}}}}}}' -F o=<owner> -F r=<repo> -F n=<number>
```

Keep threads with `isResolved: false`. None → skip to step 8.

### 5. Classify threads

- **fixable** — a concrete code, naming, typo or test change inside the user's own diff.
- **needs-user** — design choice, scope change, disagreement with the reviewer, or a question only the author can answer.

Show both groups with `path:line` and a one-line summary.

### 6. Fix the fixable group

- Edit only files in the branch diff (`git diff --name-only origin/<base>...HEAD`). A fix that needs another file moves the thread to needs-user.
- Run the tests that cover the changed files.
- Show the diff and ask before committing. Conventional Commit message. Push with plain `git push`, after confirmation.

### 7. Reply and resolve

Draft a one-line reply per thread ("Fixed in `abc1234`.", or a short answer for needs-user). Show all drafts. After explicit confirmation, post and resolve each thread:

```bash
gh api graphql -f query='mutation($t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{id}}}' -F t=<thread id> -F b=<reply>
gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{id}}}' -F t=<thread id>
```

Resolve only fixable threads; leave needs-user threads open.

### 8. Trim the description

Rewrite the PR body through the template, not a hardcoded shape.

1. Resolve it: `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" find-pr-template --user-dir "${CLAUDE_PLUGIN_DATA}" --json true`. `path` null (several repo templates) → ask which of `candidates`. Read the file.
2. Gather `git log --format='%h %s%n%b' origin/<base>..HEAD`, `git diff --stat origin/<base>...HEAD`, a few key hunks, and any ticket id.
3. Invoke the `Agent` tool with `subagent_type: "dev-workflow:pr-writer"`, passing the template, those inputs and the current title and body. It keeps linked issues and breaking-change notes and drops filler, file lists and changelogs of the diff.
4. Show old vs new body (and the new title, only if it changed). Ask before `gh pr edit <id> --body-file -`.

### 9. Finish

- Draft and the user asked to undraft → `gh pr ready <id>`.
- User named reviewers → `gh pr edit <id> --add-reviewer <login>`. Never guess reviewers.
- `--merge` given → offer to watch `gh pr checks <id> --watch` until green, then confirm once more and run `gh pr merge <id>` with the repo's usual method. Without the flag, never merge.

### 10. Report

```
PR #<n> — <title>
Branch: up to date · CI: <green|red|pending> · Threads: <fixed>/<total> resolved, <k> need you
Remaining: <list, or "nothing — ready to merge">
```

## Errors

- **`gh` missing** → tell the user to install it
- **No permission to push or resolve** → report it, leave the thread open
- **Rate limited** → wait or use a PAT
