---
id: TSK-080
title: flowstate parallel resume and next-task automation labels
status: complete
priority: P2
tags: [flowstate, skill, parallel]
created: 2026-11-07
source: idea/PLN-035
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# flowstate parallel resume and next-task automation labels

## Description

### Goal

Let `flowstate:parallel` resume an interrupted run from existing state, with no checkpoint file. Add Automatable, Needs review and Blocked labels to `flowstate:next-task`.

### Context

`playasmurcia` `complete-backlog` handles interruption with `plan/ralph-checkpoint.md` and sorts tasks before a run:

- Automatable: clear criteria, code-only.
- Needs review: manual testing, visual judgment or external data.
- Blocked: unresolved dependency.

`parallel` and `next-task` have no resume, checkpoint or interruption handling today. An interrupted run leaves tasks in `tasks/active/` and worktrees behind, and nothing tells the next session what to do with them.

A checkpoint file would duplicate state and could drift from it. Task status, Progress Logs and leftover worktree branches already record what finished. This repo's own rule is that the CLI owns state.

`parallel/SKILL.md` is at the 150-line lint ceiling (LRN-045), so new steps go in a shared file. `shared/worktree-brief.md` is the existing neighbour.

### Approach

1. Add a resume check at the start of `parallel`: compare `task-list --status active` (tasks with `blockedBy` excluded) with `git worktree list --porcelain` and branches. Skip the main and prunable entries. Link a worktree to a task through `TSK-` references in `git log {{BASE}}..<branch>`, since `parallel` sets no branch name and its start commit on the base names every task in the group.
2. Add a marker as the first step of `shared/worktree-brief.md`: `git commit --allow-empty -m "chore: start TSK-{{ID}}"`. A subagent killed before its first real commit stays traceable.
3. Classify each leftover: merged branch (`{{BASE}}..<branch>` empty, offer cleanup), branch with unmerged commits, worktree with uncommitted changes, or worktree with only the marker commit. A worktree with no task match, including a detached one, is reported as unmatched with `git status --short` and never touched.
4. Present these and let the user merge, relaunch or return each matched task to pending. Take no destructive action without approval. Relaunch removes the old worktree only after approval and only when it holds nothing unmerged; otherwise the user merges first. Return to pending commits the move when the backlog is tracked, as `parallel` step 4 does. Active tasks with no worktree are shown as information only with no action offered, because `start-task` work looks the same.
5. Put the resume steps in `shared/parallel-resume.md` and reference it through `${CLAUDE_PLUGIN_ROOT}` with an inline sentence in `parallel` step 1, adding no lines.
6. Add the labels to `next-task` output for the rows it shows (up to 8), derived from acceptance criteria and tags. `task-list` JSON has no `depends-on` or criteria, so read each task through its `path`. Blocked means an unresolved `depends-on` only, since `next-task` already drops tasks with blocked status. Apply the Automatable filter in the `next-task` step 3 group rule, not in `parallel`.
7. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

### Files to Modify

- `plugins/flowstate/skills/parallel/SKILL.md`: inline pointer to resume steps in step 1, no added lines
- `plugins/flowstate/shared/parallel-resume.md`: new, resume workflow
- `plugins/flowstate/shared/worktree-brief.md`: marker commit as first step
- `plugins/flowstate/skills/next-task/SKILL.md`: labels in scoring and output, Automatable rule in step 3 (body 137 of 150; if it goes over, move the label rules to a shared file)
- `plugins/flowstate/README.md`: note resume behaviour

### Risks

- LRN-019: worktree subagents need rtk-safe git and plain commands, and the same applies to the resume checks.
- Worktrees from an unrelated session can look like leftovers. Match on task references in commits and report anything else without touching it.
- The marker adds one empty commit per branch, unless the merge squashes it. A subagent killed before the marker still shows up as unmatched.
- Labels are a judgment call. A wrong Automatable label sends a visual task to an unattended subagent, so the label is advisory and the user confirms the group.
- LRN-040: a blocked task can sit in `tasks/pending`, so do not infer location from status.
- No harness checks resume behaviour, and evals cover routing only. The first interrupted run is the first real test.
- Line budgets are tight: `parallel` body is 149 of 150.

## Acceptance Criteria

- [x] parallel step 1 runs a resume check comparing active tasks without blockedBy against git worktree list --porcelain, skipping main and prunable entries, matching through TSK- references in git log BASE..branch
- [x] shared/worktree-brief.md has a first step making an empty marker commit naming the task
- [x] Leftovers are classified as merged, unmerged commits, uncommitted changes or marker-only; a worktree with no task match, including detached, is reported as unmatched with git status --short and never touched
- [x] Each matched task offers merge, relaunch or return to pending with no destructive action without approval; relaunch removes the old worktree only when it holds nothing unmerged; return to pending commits the move when the backlog is tracked; active tasks with no worktree are informational only
- [x] Resume steps live in shared/parallel-resume.md, referenced through CLAUDE_PLUGIN_ROOT by an inline sentence in parallel step 1 with no added lines — evidence: shared/parallel-resume.md referenced from parallel step 1; parallel body 149 lines (2026-11-07)
- [x] next-task shows Automatable, Needs review and Blocked labels on its shown rows (up to 8), read through each task path; Blocked means an unresolved depends-on only; the Automatable filter sits in the step 3 group rule, not in parallel — evidence: next-task body 140 lines, labels in step 2 and Label column, Automatable rule in step 3 (2026-11-07)
- [x] plugins/flowstate/README.md notes resume behaviour
- [x] pnpm lint:skills and claude plugin validate . pass, and the version is set with pnpm bump — evidence: flowstate bumped to 2.19.0 with pnpm bump (2026-11-07)

## Notes

## Learnings

- LRN-055: Matching a worktree branch to a task through BASE..branch needs a merged-branch fallback
- LRN-056: A marker commit breaks merge --ff-only base sync; worktree briefs rebase instead
## Progress Log

- [2026-11-07] Created
- [2026-11-07] Started
- [2026-11-07] Merged 788125e into main. lint:skills 0/0, routing-eval flowstate 0.974, plugin validate passed. Bump pending the coordinated release.
- [2026-11-07] Completed