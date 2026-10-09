---
name: add-task
description: Grooms a request into a backlog task with priority, tags and acceptance criteria. Use when the user says "add task", "new task", "create a ticket", "file a TODO", or "I need to do X". Not for bugs or findings (use report) or implementation plans (use idea).
argument-hint: [task description]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Add Task

## Arguments

Task description (optional): $ARGUMENTS

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Read Current State

Read `{{BACKLOG}}/tasks/index.md` to understand the current backlog.

Done when: the index has been read.

### 2. Gather Task Information

Read `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md`. Run one proposal round in its format, using `$ARGUMENTS` as the title when provided. Each block carries a recommendation, so "yes" accepts all:

- **Title**: short and descriptive
- **Description**: what needs to be done and why
- **Acceptance Criteria**: 3-6 specific, testable checkboxes
- **Priority**: P1 critical or blocking, P2 do next, P3 normal, P4 nice-to-have
- **Tags**: freeform labels suggested from the description
- **Dependencies**: pending tasks from the index this one depends on, or none

Done when: the user accepted or overrode every block in the round.

### 3. Create Task via CLI

Pipe the description via stdin heredoc:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create \
  --title "{{TITLE}}" \
  --priority {{PRIORITY}} \
  --tags "{{TAGS}}" \
  --criteria '{{CRITERIA_JSON}}' \
  --source manual \
  --depends-on "{{DEPS}}" \
  --body -
{{DESCRIPTION}}
BODY
```

- `{{CRITERIA_JSON}}` is a JSON array of strings, e.g. `'["criterion 1","criterion 2"]'`
- `{{DEPS}}` is comma-separated task IDs, e.g. `TSK-001,TSK-002`. Omit the `--depends-on` flag entirely if there are no dependencies; omit `--criteria` if none were gathered.

The CLI assigns the ID, creates the task file, and updates `tasks/index.md`.

Done when: the CLI prints the new TSK ID.

### 4. Confirm

```
Created TSK-{{ID}}: {{TITLE}}
  Priority: {{PRIORITY}}
  Tags: {{TAGS}}
  File: {{BACKLOG}}/tasks/pending/TSK-{{ID}}-{{slug}}.md

Next steps:
  /flowstate:start-task TSK-{{ID}}  — Start working on it
  /flowstate:overview               — View updated backlog
```
