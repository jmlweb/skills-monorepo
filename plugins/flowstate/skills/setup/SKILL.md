---
name: setup
description: Initializes the flowstate backlog in the current project, optionally private.
disable-model-invocation: true
argument-hint: [project name]
allowed-tools: [Bash, Read, Write, Glob]
model: haiku
---

# Initialize Backlog

Set up the backlog directory structure in the current project (default `.backlog/`, or a private directory chosen below).

## Arguments

Project name (optional): $ARGUMENTS

## Workflow

### 1. Check Existing State

- Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path`. If it prints a directory, a backlog already exists there (affects only what you report in Step 5); if it errors, none does yet
- Either way, do NOT create directories or index files by hand — the CLI in Step 4 is idempotent and creates only what is missing

### 2. Project Name

If `$ARGUMENTS` is provided, use it as the project name. Otherwise, infer from the current directory name or ask the user.

### 3. Public or Private?

Skip this question if a backlog already exists. Otherwise ask whether the backlog should be committed with the project (default) or kept private, outside version control without editing `.gitignore`. Private uses `--private` (creates `<common-git-dir>/flowstate`, shared by all worktrees) or `--dir <path>` for a custom location.

### 4. Create Backlog Structure

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}" [--private | --dir "{{PATH}}"]
```

This creates the full directory structure, index files, and templates in one step. For a private backlog the output includes `settingsFile` and `settingsSnippet`.

### 5. Confirm

Report what was created, with `{{BACKLOG}}` = the `root` printed by the CLI:

```
Initialized {{BACKLOG}} for {{PROJECT_NAME}}

Structure:
  {{BACKLOG}}/ideas/{pending,complete}/
  {{BACKLOG}}/reports/{pending,complete}/
  {{BACKLOG}}/tasks/{pending,active,complete}/
  {{BACKLOG}}/tasks/index.md
  {{BACKLOG}}/learnings/index.md

Available commands:
  /flowstate:add-task    — Add a new task
  /flowstate:idea        — Generate an idea (implementation plan)
  /flowstate:report      — File a report (bug, finding, security)
  /flowstate:overview    — View backlog overview
```

For a private backlog, also print the snippet for the user to merge into the git-ignored `.claude/settings.local.json` (never edit settings yourself), then ask them to restart the session and verify with `echo $FLOWSTATE_BACKLOG_DIR`:

```json
{ "env": { "FLOWSTATE_BACKLOG_DIR": "{{ABSOLUTE_PATH}}" } }
```

Until the variable is set, flowstate will not find the private backlog.

## Idempotency

This command is safe to run multiple times. It will:
- Create missing directories without affecting existing ones
- Create missing index files without overwriting existing ones
- Never delete or modify existing content
