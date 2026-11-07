---
name: setup
description: Initializes the flowstate backlog in the current project, as files (optionally private) or GitHub Issues.
disable-model-invocation: true
argument-hint: [project name]
allowed-tools: [Read, "Bash(node:*)"]
model: haiku
---

# Initialize Backlog

Set up the backlog in the current project: `.backlog/` by default, a private directory, or GitHub Issues (learnings stay in `.backlog/learnings/`), chosen below.

## Arguments

Project name (optional): $ARGUMENTS

## Workflow

### 1. Check Existing State

- Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path`. If it prints a directory, a backlog already exists there (affects only what you report in Step 5); if it errors, none does yet
- Either way, leave directory and index creation to the CLI in Step 4, which is idempotent and creates only what is missing

Done when: it is known whether a backlog exists.

### 2. Project Name

If `$ARGUMENTS` is provided, use it as the project name. Otherwise, infer from the current directory name or ask the user.

Done when: one project name is fixed.

### 3. Where does the backlog live?

Skip this question if a backlog already exists. Otherwise offer three homes, recommending the first:

- **A.** Files committed with the project (default).
- **B.** Files kept private, outside version control without editing `.gitignore`: `--private` (creates `<common-git-dir>/flowstate`, shared by all worktrees) or `--dir <path>` for a custom location.
- **C.** GitHub Issues: tasks, ideas and reports become issues of the project's repository; only learnings stay in files. Uses `--github`, with `--repo owner/name` when the checkout has no GitHub remote or another repository should hold the issues. Needs the `gh` CLI logged in with write access.

Done when: the choice is A, `--private`, `--dir <path>`, or `--github [--repo owner/name]`.

### 4. Create Backlog Structure

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}" [--private | --dir "{{PATH}}" | --github [--repo "{{REPO}}"]]
```

Phrase `{{PROJECT_NAME}}` and `{{REPO}}` without `"`, `$` or backticks: they sit inside double quotes. This creates the full directory structure, index files, and templates in one step. For a private or GitHub backlog the output includes `settingsFile` and `settingsSnippet`; `--github` also verifies `gh auth status` and the repository and creates the flowstate labels, so an error there names what to fix (`gh auth login`, or the repository).

Done when: the CLI exits 0 and prints `root`.

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

For a GitHub backlog, replace the Structure block with:

```
Backend: GitHub Issues in {{REPO}} (labels created: flowstate:task, flowstate:idea, flowstate:report, status:*, P1-P4)
  {{BACKLOG}}/learnings/index.md   (learnings stay local)
```

For a private or GitHub backlog, also print the `settingsSnippet` the CLI returned for the user to merge into the git-ignored `.claude/settings.local.json` (the user applies it; settings stay untouched), then ask the user to restart the session and verify with `echo $FLOWSTATE_BACKLOG_DIR` (private) or `echo $FLOWSTATE_BACKEND` (GitHub):

```json
{ "env": { "FLOWSTATE_BACKLOG_DIR": "{{ABSOLUTE_PATH}}" } }
```

Until the variable is set, flowstate will not find the private backlog, or will keep using files instead of issues.

Done when: the confirmation block is printed (plus the settings snippet for a private or GitHub backlog).

## Idempotency

Re-running creates only missing directories and index files; existing content is untouched.
