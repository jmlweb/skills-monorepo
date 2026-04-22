---
name: add-learning
description: Document a learning or insight discovered during development. Use when the user says "learned something", "TIL", "note this", "remember this for next time", or when a non-obvious discovery is made while working.
argument-hint: [learning description]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Add Learning

Document an insight, mistake, or discovery so it can be referenced in future work.

## Arguments

Learning description (optional): $ARGUMENTS

## Prerequisites

Verify `.backlog/` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

The default mode is **auto-draft**: write the learning directly from available context, no questions. Only fall back to interactive mode when context is genuinely insufficient.

### 1. Decide Mode

**Auto-draft mode** (preferred): use it if ANY of these are true:
- `$ARGUMENTS` is non-empty
- The recent conversation contains a clear insight (a discovery, a gotcha, "ah, that failed because…", a confirmed root cause, a non-obvious pattern that worked)

**Interactive mode**: only if `$ARGUMENTS` is empty AND no clear insight is present in recent context.

### 2a. Auto-Draft Mode

Derive every field from `$ARGUMENTS` + recent conversation. Do NOT ask the user:

- **Title** — one short line capturing the insight
- **Context** — what was being worked on when the discovery happened
- **Insight** — the non-obvious part, the *why*
- **Application** — what to do (or avoid) in the future
- **Tags** — derive from content keywords; if a task is being linked (see Step 3), include its tags too

Skip directly to Step 3.

### 2b. Interactive Mode

Ask only when context is missing:

1. **What did you learn?** — Brief title
2. **Context** — What were you doing when you discovered this?
3. **Insight** — Why is this important? What's the non-obvious part?
4. **Application** — What should you do (or avoid) in the future?
5. **Tags** — Freeform labels (e.g., `database`, `testing`, `deployment`)

### 3. Link to Active Task (no prompt unless ambiguous)

Check `.backlog/tasks/active/`:

- **Exactly 1 active task** → link automatically (`--task TSK-XXX`). Do NOT ask.
- **Multiple active tasks** → ask which one (or none) this relates to.
- **Zero active tasks** → omit `--task`.

### 4. Create Learning via CLI

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task {{TSK_ID}} --body -
{{LEARNING_CONTENT}}
BODY
```

The CLI handles ID assignment, directory creation, index update, and task linking automatically.

Omit `--task` if no active task is linked.

### 5. Confirm

```
Added LRN-{{ID}}: {{TITLE}}
  Tags: {{TAGS}}
  Linked to: TSK-{{XXX}} (or "No active task")
  Directory: .backlog/learnings/LRN-{{ID}}-{{slug}}/

Edit the file directly to refine. Add screenshots/attachments to the directory.
```
