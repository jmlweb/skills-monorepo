---
name: start-task
description: Moves a task from pending to active, surfaces relevant learnings, and begins implementation. Use when the user says "start task", "begin working on", "pick up task", or "work on TSK-XXX". Not for choosing which task (use next-task).
argument-hint: [task ID or number]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Start Task

## Arguments

Task identifier (optional): $ARGUMENTS — accepts `TSK-001`, `001`, or `1`.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Identify Task

If `$ARGUMENTS` provided, find the matching file in `{{BACKLOG}}/tasks/pending/`. If it is not there but exists in `{{BACKLOG}}/tasks/active/`, the task is already started — skip Step 4 (no move) and go to Step 5. If found nowhere, say so and stop.

If no argument, list all pending non-blocked tasks and ask which to start.

Done when: one task file is resolved, or the skill has stopped.

### 2. Validate

- Task must exist in `tasks/pending/`
- Task must NOT have `status: blocked` in frontmatter
- If blocked, show the reason and suggest resolving it first

Done when: the task is in `tasks/pending/` and not blocked, or the block reason has been shown.

### 3. Load Context

Before moving the task, gather relevant context automatically:

1. **Learnings**: Search for relevant learnings using the CLI. Pass the task's tags and its title + description as the query for maximum keyword coverage:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{TASK_TAGS}}" --query "{{TASK_TITLE}} {{TASK_DESCRIPTION_FIRST_LINE}}" --limit 3 --json true
   ```
   The CLI returns only active learnings, scored by tag match and keyword relevance. Use the `title`, `tags`, and `reasons` fields to summarize relevance. Only read the full learning file if the user asks for details.
2. **Active tasks**: Read `{{BACKLOG}}/tasks/active/` to list what else is in progress — helps the user understand current workload and spot potential overlaps.
3. **Pending reports**: Scan `{{BACKLOG}}/reports/pending/` titles for anything related to this task's scope — avoids working on something with a known open issue.

With no matching learnings or reports, say nothing about them.

Done when: learnings, active tasks and reports have been checked.

### 4. Move Task to Active

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to active
```

The CLI moves the file, sets `status: active` and `started`, logs an entry, and updates `tasks/index.md`.

Done when: the CLI reports the task in `tasks/active/`.

### 5. Show Task Summary and Begin

Show the summary, then start implementing immediately: invoking `/start-task` was the confirmation.

```
Started TSK-{{ID}}: {{TITLE}}

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Relevant Learnings          ← only if matches found
- LRN-XXX: {{TITLE}} — {{key insight}}

## Also Active                 ← only if other active tasks exist
- TSK-YYY: {{TITLE}}

Reminders: /flowstate:add-learning · /flowstate:block-task · /flowstate:complete-task
```

After printing the summary, proceed directly: read the relevant code, make changes, run tests.

## Notes

- Multiple tasks can be active simultaneously
- Starting a task leaves other tasks free to start
