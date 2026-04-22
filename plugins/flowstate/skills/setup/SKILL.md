---
name: setup
description: Initialize the .backlog/ directory structure in the current project. Use when starting a new project, setting up backlog management, or when the user says "set up flowstate", "create backlog", or "initialize tracking". Idempotent.
argument-hint: [project name]
allowed-tools: [Bash, Read, Write, Glob]
model: haiku
---

# Initialize Backlog

Set up the `.backlog/` directory structure in the current project.

## Arguments

Project name (optional): $ARGUMENTS

## Workflow

### 1. Check Existing State

- If `.backlog/` already exists, check which subdirectories/files are missing and only create those
- If it doesn't exist, create everything from scratch

### 2. Project Name

If `$ARGUMENTS` is provided, use it as the project name. Otherwise, infer from the current directory name or ask the user.

### 3. Create Backlog Structure

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}"
```

This creates the full directory structure, index files, and templates in one step.

### 4. Confirm

Report what was created:

```
Initialized .backlog/ for {{PROJECT_NAME}}

Structure:
  .backlog/ideas/{pending,complete}/
  .backlog/reports/{pending,complete}/
  .backlog/tasks/{pending,active,complete}/
  .backlog/tasks/index.md
  .backlog/learnings/index.md

Available commands:
  /flowstate:add-task    — Add a new task
  /flowstate:idea        — Generate an implementation plan
  /flowstate:report      — File a bug report or finding
  /flowstate:overview    — View backlog overview
```

## Idempotency

This command is safe to run multiple times. It will:
- Create missing directories without affecting existing ones
- Create missing index files without overwriting existing ones
- Never delete or modify existing content
