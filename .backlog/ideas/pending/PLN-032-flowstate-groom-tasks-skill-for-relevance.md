---
id: PLN-032
title: flowstate groom-tasks skill for relevance and priority
status: pending
created: 2026-11-06
complexity: medium
---

## Goal

Add a user-invoked `flowstate:groom-tasks` skill that reviews all open tasks and proposes priority, spec and obsolescence changes as one list, then applies only the rows the user approves.

## Context

`check-task` compares status with code and `next-task` ranks what exists, but nothing questions whether priorities and specs are still right. This repo has 15 pending tasks, many of them `Fix:` items of similar age.

`hyntx` has this as `groom-tasks` and `reprioritize`. Both run on GitHub Issues and labels, so this is a port, not a copy. Merge them: `reprioritize` is a subset of grooming.

Useful criteria from the sources:

- Relevance: is the task still needed given the current code?
- Priority accuracy: does it block other work, or has its impact changed?
- Specification quality: are acceptance criteria present and checkable?

TSK-057 will add a GitHub Issues backend, so this skill must use only the CLI and never read task files directly for state.

## Approach

1. Load open tasks with `task-list` for `pending` and `active`, narrowed by an optional `--tag` or `--priority` argument.
2. Assess each task against the code, using Grep and Read to check that referenced files and behaviour still exist.
3. Present one table: task, current priority, proposed change, one-line evidence. Rows with no change are counted, not listed.
4. Ask which rows to apply, with lettered choices so the menu survives rendering.
5. Apply approved priority rows through `task-update --set` and `--log`, so each change leaves a Progress Log reason. Spec rows are advisory: apply them as a `--log` note only, because the CLI has no write path for task bodies or new criteria.
6. List obsolete tasks as proposals for the user to close. The skill never deletes a task.
7. Run `flowstate index-rebuild --type tasks` after a bulk apply.

## Decisions

- An obsolete task closes through `task-move` to complete with a logged reason, run by the user. No new status. The task must confirm `task-move` has no criteria gate.
- Editing task bodies from this skill is out of scope.

## Files to Modify

- `plugins/flowstate/skills/groom-tasks/SKILL.md` — new skill with `disable-model-invocation: true`, `model: sonnet`, `effort: medium`
- `plugins/flowstate/skills/guide/SKILL.md` — router entry
- `plugins/flowstate/SKILL.md` — command table row
- `plugins/flowstate/README.md` — command table row
- `AGENTS.md` — skill count on line 29
- `README.md` — skill counts on lines 51 and 159

## Risks & Considerations

- Large backlogs make this expensive. The `--tag` and `--priority` filters are the cost control.
- Evidence must come from code, not from task titles, or the output becomes confident guessing.
- LRN-040: a blocked task can sit in `tasks/pending`, so status does not say where a task lives. Read location from the CLI.
- LRN-041: `task-block` can leave `tasks/index.md` stale. `index-rebuild` covers this in any repo, since `pnpm backlog:check` exists only in this monorepo.

## Revision History

- [2026-11-07] Made spec rows advisory, decided obsolete tasks close through `task-move`, replaced `pnpm backlog:check` with `index-rebuild`, added filter arguments, added skill-count locations to Files to Modify.
