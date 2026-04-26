---
name: add-task
description: Interactively groom and add a new task to the backlog. Use when the user wants to add work, create a ticket, file a TODO, track a feature request, or says "add task", "new task", "I need to do X".
argument-hint: [task description]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Add Task

Interactively groom a new task and add it to the backlog.

## Arguments

Task description (optional): $ARGUMENTS

## Prerequisites

Verify `.backlog/` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Read Current State

Read `.backlog/tasks/index.md` to understand the current backlog.

### 2. Gather Task Information

If `$ARGUMENTS` is provided, use it as the title. Otherwise ask.

Collect interactively:

1. **Title** — Short, descriptive (e.g., "Add user authentication", "Fix pagination bug")
2. **Description** — What needs to be done and why
3. **Acceptance Criteria** — Ask iteratively: "What else needs to be true for this to be complete?" Aim for 3-6 specific, testable criteria as checkboxes
4. **Priority** — Suggest based on description:

   | Priority | When to use |
   |----------|-------------|
   | P1 | Critical / blocking other work |
   | P2 | High priority, should be done next |
   | P3 | Normal backlog item |
   | P4 | Nice-to-have, future consideration |

5. **Tags** — Freeform labels (e.g., `backend`, `auth`, `ui`, `performance`). Suggest based on description
6. **Dependencies** — Show pending tasks and ask if this depends on any

### 3. Create Task via CLI

Pipe the description via stdin:

```bash
echo "{{DESCRIPTION}}" | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create \
  --title "{{TITLE}}" \
  --priority {{PRIORITY}} \
  --tags "{{TAGS}}" \
  --criteria '{{CRITERIA_JSON}}' \
  --source manual \
  --depends-on "{{DEPS}}" \
  --body -
```

The CLI assigns the next ID, creates the task file, and updates `tasks/index.md` automatically.

### 4. Confirm

```
Created TSK-{{ID}}: {{TITLE}}
  Priority: {{PRIORITY}}
  Tags: {{TAGS}}
  File: .backlog/tasks/pending/TSK-{{ID}}-{{slug}}.md

Next steps:
  /flowstate:start-task TSK-{{ID}}  — Start working on it
  /flowstate:overview               — View updated backlog
```
