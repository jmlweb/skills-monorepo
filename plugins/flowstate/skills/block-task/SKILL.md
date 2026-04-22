---
name: block-task
description: Mark a task as blocked with a documented reason. Use when the user hits a dependency, external blocker, or technical limitation — says "blocked by", "can't proceed", "waiting for", "stuck on".
argument-hint: [task ID] [reason]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Block Task

Mark a task as blocked, document the reason, and suggest alternatives.

## Arguments

$ARGUMENTS — First word is the task ID, rest is the block reason. Both optional.

## Prerequisites

Verify `.backlog/` exists.

## Workflow

### 1. Identify Task

Parse `$ARGUMENTS` for task ID (first word if it matches TSK-XXX, XXX, or a number).

If no ID, check for active tasks and ask which to block. Look in both `tasks/active/` and `tasks/pending/`.

### 2. Get Block Reason

If reason provided in `$ARGUMENTS` (words after the ID), use it. Otherwise ask.

Suggest common categories:
- **Dependency**: "Waiting for TSK-XXX to complete"
- **External**: "Waiting for API credentials / third-party response"
- **Technical**: "Discovered a technical limitation"
- **Clarification**: "Requirements are unclear, need user input"

### 3. Block Task via CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-block {{ID}} --reason "{{REASON}}"
```

The CLI sets `status: blocked` and `blocked-by` in frontmatter, adds a progress log entry. The task file stays in its current directory (pending or active).

### 4. Auto-Capture Technical Insight

If the blocker is **Technical** (a limitation discovered, not waiting on an external party), auto-draft a learning silently from the reason + recent conversation context. Derive title, tags, and body (Context / Insight / Application) from that context — do NOT ask the user. Link to the blocked task with `--task TSK-{{ID}}`.

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task TSK-{{ID}} --body -
{{BODY_DRAFTED_FROM_CONTEXT}}
BODY
```

Skip silently for Dependency / External / Clarification blockers — those don't yield reusable insights.

### 5. Confirm and Suggest

Print the confirmation with unblocked alternatives and any auto-captured learning. Do NOT prompt for follow-up actions:

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
