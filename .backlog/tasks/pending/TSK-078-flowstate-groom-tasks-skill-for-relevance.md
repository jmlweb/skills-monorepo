---
id: TSK-078
title: flowstate groom-tasks skill for relevance and priority
status: pending
priority: P2
tags: []
created: 2026-11-06
source: idea/PLN-032
depends-on: []
---

# flowstate groom-tasks skill for relevance and priority

## Description

### Goal

Add a user-invoked `flowstate:groom-tasks` skill that reviews all open tasks and proposes priority, spec and obsolescence changes as one list, then applies only the rows the user approves.

### Approach

1. Load open tasks with `task-list` for `pending` and `active`. `task-list` accepts only `--status` and `--limit`, so the skill filters an optional `--tag` or `--priority` argument itself from the JSON output.
2. Assess each task against the code, using Grep and Read to check that referenced files and behaviour still exist.
3. Present one table: task, current priority, proposed change, one-line evidence. Rows with no change are counted, not listed.
4. Ask which rows to apply, with lettered choices so the menu survives rendering.
5. Apply approved priority rows through `task-update --set` and `--log`, so each change leaves a Progress Log reason. `--set` does not validate values, so proposals stay within P1-P4. Spec rows are advisory: apply them as a `--log` note only, because the CLI has no write path for task bodies or new criteria. `--log` throws `SectionNotFoundError` when a task has no `Progress Log`: report that row as failed and continue.
6. List obsolete tasks as proposals for the user to close. The skill never deletes a task.
7. Run `flowstate index-rebuild --type tasks` after a bulk apply.
8. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

### Decisions

- An obsolete task closes through `task-move` to complete, run by the user. `task-move` has no criteria gate: it only returns `unverifiedCriteria`. It records a plain "Completed" entry, so the reason is logged with `task-update --log` before the move. No new status.
- Editing task bodies from this skill is out of scope.

### Risks

- Large backlogs make this expensive. The `--tag` and `--priority` filters are the cost control.
- Evidence must come from code, not from task titles, or the output becomes confident guessing.
- LRN-040: a blocked task can sit in `tasks/pending`, so status does not say where a task lives. Read location from the CLI.
- LRN-041: `task-block` can leave `tasks/index.md` stale. `index-rebuild` covers this in any repo, since `pnpm backlog:check` exists only in this monorepo.
- TSK-057 will add a GitHub Issues backend, so this skill must use only the CLI and never read task files directly for state.

## Acceptance Criteria

- [ ] skills/groom-tasks/SKILL.md exists with disable-model-invocation true, model sonnet and effort medium, and reads task state only through the CLI
- [ ] Open tasks load from task-list for pending and active, and the skill filters --tag and --priority itself from the JSON output
- [ ] Each task is assessed against the code, and proposals appear in one table with task, current priority, proposed change and one-line evidence, with unchanged rows counted not listed
- [ ] Rows are chosen through lettered choices and only approved rows are applied
- [ ] Priority rows apply through task-update --set and --log with proposals restricted to P1-P4, and spec rows apply as a --log note only
- [ ] A row that fails with SectionNotFoundError for a missing Progress Log is reported as failed and the remaining rows still apply
- [ ] Obsolete tasks are listed as proposals for the user to close, the skill never deletes a task, and the reason is logged before any task-move to complete
- [ ] index-rebuild --type tasks runs after a bulk apply
- [ ] guide/SKILL.md, plugins/flowstate/SKILL.md, plugins/flowstate/README.md, AGENTS.md line 29 and README.md lines 51 and 159 are updated for the new skill
- [ ] pnpm lint:skills and claude plugin validate . pass and the version is set with pnpm bump

## Notes

## Learnings

## Progress Log

- [2026-11-06] Created