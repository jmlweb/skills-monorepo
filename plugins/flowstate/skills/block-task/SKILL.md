---
name: block-task
description: Marks a task as blocked with a documented reason, or unblocks it, and lists unblocked alternatives. Use when the user says "blocked by", "can't proceed", "waiting for", "stuck on", or "unblock task". Not for finishing a task (use complete-task).
argument-hint: [task ID] [reason]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Block Task

## Arguments

$ARGUMENTS — First word is the task ID, rest is the block reason. Both optional.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists.

## Workflow

### 1. Identify Task

Parse `$ARGUMENTS` for task ID (first word if it matches TSK-XXX, XXX, or a number).

If no ID, check for active tasks and ask which to block. Look in both `tasks/active/` and `tasks/pending/`.

Done when: a single task ID is resolved.

### 2. Get Block Reason

If reason provided in `$ARGUMENTS` (words after the ID), use it. Otherwise ask.

Suggest common categories:
- **Dependency**: "Waiting for TSK-XXX to complete"
- **External**: "Waiting for API credentials / third-party response"
- **Technical**: "Discovered a technical limitation"
- **Clarification**: "Requirements are unclear, need user input"

Done when: a non-empty reason string exists.

### 3. Block Task via CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-block {{ID}} --reason "{{REASON}}"
```

The CLI sets `status: blocked` and `blocked-by` and adds a progress log entry; the task file stays in its directory.

Done when: the CLI reports the task as blocked.

### 4. Auto-Capture Technical Insight

If the blocker is **Technical** (a limitation discovered, not waiting on an external party), auto-draft a learning silently from the reason + recent conversation context, deriving title, tags, and body (Context / Insight / Application) without asking. Link to the blocked task with `--task TSK-{{ID}}`.

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task TSK-{{ID}} --body -
{{BODY_DRAFTED_FROM_CONTEXT}}
BODY
```

Dependency, External and Clarification blockers yield no reusable insight; skip this step for them.

Done when: a learning ID exists (Technical blocker) or the blocker category is not Technical.

### 5. Confirm and Suggest

Print the confirmation with unblocked alternatives and any auto-captured learning, with no follow-up prompt:

```
Blocked TSK-{{ID}}: {{REASON}}

Captured: LRN-XXX — {{TITLE}}            ← only if Step 4 created one

Unblocked alternatives:
- TSK-XXX: {{TITLE}}

/flowstate:report can file this as a finding if it needs broader visibility.
```

## Unblocking

To unblock a task:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-unblock {{ID}} --resolution "{{TEXT}}"
```

Then use `/flowstate:start-task` if needed.
