# Parallel resume

Read by `parallel` step 1 when active tasks or extra worktrees exist. An interrupted run leaves tasks in `tasks/active/` and worktrees behind; task status, Progress Logs and the branches already record what finished, so there is no checkpoint file to read. `{{BASE}}` is the current branch (`git branch --show-current`). Every git call here is one plain command with literal paths, as in the worktree brief; the only redirect is `git -C` for the `status` of another worktree, which runs in the coordinator session.

## 1. Gather state

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true
git worktree list --porcelain
```

Keep the tasks without `blockedBy` (a blocked task keeps its bucket, so the list is by location, never by status). From the worktree list skip the first entry (the main checkout) and every entry carrying a `prunable` line; record each remaining `worktree` path with its `branch` (`refs/heads/<name>`, use `<name>`) or its `detached` line.

Done when: the active task IDs and the candidate worktrees are listed, or both are empty and `parallel` continues with its candidates.

## 2. Match worktrees to tasks

For each worktree with a branch:

```bash
git log --format=%s {{BASE}}..{{BRANCH}}
```

Collect the `TSK-NNN` references in those subjects (the marker commit `chore: start TSK-NNN` names the task even when the subagent made no other commit). When the range is empty the branch is merged: take the reference from `git log -1 --format=%s {{BRANCH}}` instead, and treat a `chore(backlog): start` subject as no reference, since that group commit names every task of the run. A worktree matches a task when exactly one referenced task is in the active list from step 1. Everything else is unmatched: detached worktrees, worktrees with no reference, references to tasks that are not active, or more than one active task. Report an unmatched worktree with its path, branch or `detached`, and the output of:

```bash
git -C "{{WORKTREE_PATH}}" status --short
```

An unmatched worktree may belong to another session; the report is the only action on it.

Done when: every candidate worktree is matched to one active task or listed as unmatched.

## 3. Classify each matched worktree

Check the branch and the working tree, then pick the first row that applies:

```bash
git -C "{{WORKTREE_PATH}}" status --short
```

| State | Evidence |
|-------|----------|
| uncommitted changes | `status --short` prints lines |
| merged | `git log {{BASE}}..{{BRANCH}}` is empty (a squash merge still shows commits; the user says when one happened) |
| marker-only | the range holds only the `chore: start TSK-NNN` commit |
| unmerged commits | the range holds real commits |

Active tasks with no matched worktree are informational: `start-task` work looks the same, so they get no action.

Done when: every matched task carries one of the four states.

## 4. Present and act

```
## Resume check

| Task | Worktree | Branch | State | Recommended |
|------|----------|--------|-------|-------------|
| TSK-{{ID}} | {{WORKTREE_PATH}} | {{BRANCH}} | {{STATE}} | {{LETTER}} |

Unmatched worktrees (left as they are):
- {{WORKTREE_PATH}} ({{BRANCH}} or detached): {{status --short lines, or clean}}

Active with no worktree (no action): TSK-{{ID}}, ...

Per task: A merge, B relaunch, C return to pending, D leave as is. Reply "yes" for the recommendations, or "TSK-{{ID}}: B" to override one.
```

Recommend A for unmerged commits, B for marker-only, D for uncommitted changes (the user commits or discards inside that worktree first), and the cleanup from `parallel` step 7 for merged. Every command below runs only after the user has answered, one at a time, checked with `git worktree list` afterwards:

- **A merge**: `git merge {{BRANCH}}` on `{{BASE}}`. A conflict stops the resume with the conflicting files listed; the user resolves it. After a clean merge offer the step 7 cleanup, then `/flowstate:complete-task`.
- **B relaunch**: available for merged and marker-only worktrees with a clean `status --short`, because they hold nothing unmerged; otherwise answer that the user merges first (A). Run `git worktree remove "{{WORKTREE_PATH}}"`, then `git branch -D {{BRANCH}}`, then `git worktree prune`. The task joins the selected candidates; it is already active, so step 4 skips its move.
- **C return to pending**: `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to pending`, then, when `{{BACKLOG}}` is tracked as step 4 defines, `git add "{{BACKLOG}}" && git commit -m "chore(backlog): return {{IDS}} to pending" -- "{{BACKLOG}}"`. The worktree stays; offer its removal only when it is merged or marker-only.
- **D leave as is**: no command; the row is repeated in the final `parallel` report.

Done when: every matched task has an answered choice and its commands ran, or was left as is, and `parallel` continues at its step 1 with the remaining candidates.
