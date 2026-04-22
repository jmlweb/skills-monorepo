---
name: start-task
description: Start working on a task by moving it from pending to active. Use when the user says "start task", "begin working on", "pick up task", or wants to begin implementing something from the backlog.
argument-hint: [task ID or number]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Start Task

Mark a task as in-progress and move it to the active directory.

## Arguments

Task identifier (optional): $ARGUMENTS — accepts `TSK-001`, `001`, or `1`.

## Prerequisites

Verify `.backlog/` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Identify Task

If `$ARGUMENTS` provided, find the matching file in `.backlog/tasks/pending/`.

If no argument, list all pending non-blocked tasks and ask which to start.

### 2. Validate

- Task must exist in `tasks/pending/`
- Task must NOT have `status: blocked` in frontmatter
- If blocked, show the reason and suggest resolving it first

### 3. Load Context

Before moving the task, gather relevant context automatically:

1. **Learnings**: Search for relevant learnings using the CLI. Pass the task's tags and its title + description as the query for maximum keyword coverage:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{TASK_TAGS}}" --query "{{TASK_TITLE}} {{TASK_DESCRIPTION_FIRST_LINE}}" --limit 3 --json true
   ```
   The CLI returns only active learnings, scored by tag match and keyword relevance. Use the `title`, `tags`, and `reasons` fields to summarize relevance. Only read the full learning file if the user asks for details.
2. **Active tasks**: Read `.backlog/tasks/active/` to list what else is in progress — helps the user understand current workload and spot potential overlaps.
3. **Pending reports**: Scan `.backlog/reports/pending/` titles for anything related to this task's scope — avoids working on something with a known open issue.

If no learnings or reports match, skip silently — do not mention the absence.

### 4. Move Task to Active

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to active
```

The CLI moves the file, updates frontmatter (`status: active`, `started: today`), adds a progress log entry, and updates `tasks/index.md` automatically.

### 5. Show Task Summary and Begin

Show the summary, then start implementing immediately — do NOT ask for confirmation. The user already invoked `/start-task`; that is the confirmation.

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
- Starting a task does NOT block other tasks from being started
