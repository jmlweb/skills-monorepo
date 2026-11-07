---
id: PLN-035
title: flowstate parallel resume and next-task automation labels
status: approved
created: 2026-11-06
complexity: medium
reviewed: 2026-11-07
task-id: TSK-080
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

1. Add a resume check at the start of `parallel`: compare `task-list --status active` (tasks with `blockedBy` excluded) with `git worktree list --porcelain` and branches. Skip the main and prunable entries. Link a worktree to a task through `TSK-` references in `git log {{BASE}}..<branch>`, since `parallel` sets no branch name and its start commit on the base names every task in the group.
2. Add a marker as the first step of `shared/worktree-brief.md`: `git commit --allow-empty -m "chore: start TSK-{{ID}}"`. A subagent killed before its first real commit stays traceable.
3. Classify each leftover: merged branch (`{{BASE}}..<branch>` empty, offer cleanup), branch with unmerged commits, worktree with uncommitted changes, or worktree with only the marker commit. A worktree with no task match, including a detached one, is reported as unmatched with `git status --short` and never touched.
4. Present these and let the user merge, relaunch or return each matched task to pending. Take no destructive action without approval. Relaunch removes the old worktree only after approval and only when it holds nothing unmerged; otherwise the user merges first. Return to pending commits the move when the backlog is tracked, as `parallel` step 4 does. Active tasks with no worktree are shown as information only with no action offered, because `start-task` work looks the same.
5. Put the resume steps in `shared/parallel-resume.md` and reference it through `${CLAUDE_PLUGIN_ROOT}` with an inline sentence in `parallel` step 1, adding no lines.
6. Add the labels to `next-task` output for the rows it shows (up to 8), derived from acceptance criteria and tags. `task-list` JSON has no `depends-on` or criteria, so read each task through its `path`. Blocked means an unresolved `depends-on` only, since `next-task` already drops tasks with blocked status. Apply the Automatable filter in the `next-task` step 3 group rule, not in `parallel`.
7. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

## Files to Modify

- `plugins/flowstate/skills/parallel/SKILL.md` — inline pointer to resume steps in step 1, no added lines
- `plugins/flowstate/shared/parallel-resume.md` — new, resume workflow
- `plugins/flowstate/shared/worktree-brief.md` — marker commit as first step
- `plugins/flowstate/skills/next-task/SKILL.md` — labels in scoring and output, Automatable rule in step 3 (body 137 of 150)
- `plugins/flowstate/README.md` — note resume behaviour

## Risks & Considerations

- LRN-019: worktree subagents need rtk-safe git and plain commands, and the same applies to the resume checks.
- Worktrees from an unrelated session can look like leftovers. Match on task references in commits and report anything else without touching it.
- The marker adds one empty commit per branch, unless the merge squashes it. A subagent killed before the marker still shows up as unmatched.
- Labels are a judgment call. A wrong Automatable label sends a visual task to an unattended subagent, so the label is advisory and the user confirms the group.
- LRN-040: a blocked task can sit in `tasks/pending`, so do not infer location from status.
- No harness checks resume behaviour, and evals cover routing only. The first interrupted run is the first real test.
- Line budgets are tight: `parallel` body is 149 of 150.

## Revision History

- [2026-11-07] Replaced branch-name matching with commit references (branch names carry no task ID), added the uncommitted-changes class and unmatched reporting, made active-without-worktree informational, excluded blocked tasks, narrowed the Blocked label to unresolved `depends-on`, replaced the test step with lint, validate and bump, recorded the missing behaviour harness as a risk.
- [2026-11-07] Scoped commit matching to `{{BASE}}..<branch>` because the start commit names every task, added the merged class, added a marker commit to `worktree-brief.md` so killed subagents stay traceable, moved the Automatable filter to the `next-task` step 3 group rule, limited labels to shown rows read through `path`, made the `parallel` pointer an inline sentence, defined relaunch and return-to-pending handling, switched to `git worktree list --porcelain` with filtering, corrected the `next-task` budget to body 137.
