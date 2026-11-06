---
id: PLN-035
title: flowstate parallel resume and next-task automation labels
status: pending
created: 2026-11-06
complexity: medium
---

## Goal

Let `flowstate:parallel` resume an interrupted run from existing state, with no checkpoint file. Add Automatable, Needs review and Blocked labels to `flowstate:next-task`.

## Context

`playasmurcia` `complete-backlog` handles interruption with `plan/ralph-checkpoint.md` and sorts tasks before a run:

- Automatable: clear criteria, code-only.
- Needs review: manual testing, visual judgment or external data.
- Blocked: unresolved dependency.

`parallel` and `next-task` have no resume, checkpoint or interruption handling today. An interrupted run leaves tasks in `tasks/active/` and worktrees behind, and nothing tells the next session what to do with them.

A checkpoint file would duplicate state and could drift from it. Task status, Progress Logs and leftover worktree branches already record what finished. This repo's own rule is that the CLI owns state.

`parallel/SKILL.md` is at the 150-line lint ceiling (LRN-045), so new steps go in a shared file. `shared/worktree-brief.md` is the existing neighbour.

## Approach

1. Add a resume check at the start of `parallel`: compare `task-list --status active` (blocked tasks excluded) with `git worktree list` and branches. Link a worktree to a task through `TSK-` references in the `git log` of its branch, since `parallel` sets no branch name and the subagent brief only requires a commit referencing the task.
2. Classify each leftover: branch with unmerged commits, worktree with uncommitted changes, or worktree with no commits. A worktree with no task match is reported as unmatched with `git status --short` and never touched.
3. Present these and let the user merge, relaunch or return each matched task to pending. Take no destructive action without approval. Active tasks with no worktree are shown as information only with no action offered, because `start-task` work looks the same.
4. Put the resume steps in `shared/parallel-resume.md` and reference it through `${CLAUDE_PLUGIN_ROOT}` with a one-line pointer from `parallel/SKILL.md`.
5. Add the labels to `next-task` output, derived from acceptance criteria and tags, so `parallel` can offer only Automatable tasks. Blocked means an unresolved `depends-on` only, since `next-task` already drops tasks with blocked status.
6. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

## Files to Modify

- `plugins/flowstate/skills/parallel/SKILL.md` — one-line pointer to resume steps; stay under the ceiling
- `plugins/flowstate/shared/parallel-resume.md` — new, resume workflow
- `plugins/flowstate/skills/next-task/SKILL.md` — labels in scoring and output (144 lines now, so stay under 150)
- `plugins/flowstate/README.md` — note resume behaviour

## Risks & Considerations

- LRN-019: worktree subagents need rtk-safe git and plain commands, and the same applies to the resume checks.
- Worktrees from an unrelated session can look like leftovers. Match on task references in commits and report anything else without touching it.
- A subagent killed before its first commit leaves nothing that ties its worktree to a task, so that worktree shows up as unmatched.
- Labels are a judgment call. A wrong Automatable label sends a visual task to an unattended subagent, so the label is advisory and the user confirms the group.
- LRN-040: a blocked task can sit in `tasks/pending`, so do not infer location from status.
- No harness checks resume behaviour, and evals cover routing only. The first interrupted run is the first real test.
- Line budgets are tight: `parallel` body is 149 of 150 and `next-task` is 144.

## Revision History

- [2026-11-07] Replaced branch-name matching with commit references (branch names carry no task ID), added the uncommitted-changes class and unmatched reporting, made active-without-worktree informational, excluded blocked tasks, narrowed the Blocked label to unresolved `depends-on`, replaced the test step with lint, validate and bump, recorded the missing behaviour harness as a risk.
