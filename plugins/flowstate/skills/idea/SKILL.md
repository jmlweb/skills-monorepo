---
name: idea
description: Generates a detailed implementation plan for a feature or change before coding begins. Use when the user says "plan this", "how should we implement", "design approach", or when a task needs architectural thinking. Not for work that is already scoped (use add-task).
argument-hint: [feature description]
allowed-tools: [Read, "Bash(node:*)", Glob, Grep]
model: sonnet
effort: high
---

# Generate Idea

## Arguments

Feature description (optional): $ARGUMENTS

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, tell the user to run `/flowstate:setup` first. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Gather Context

Read `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md` and run its rounds, starting from `$ARGUMENTS` when provided. The frontier covers:

- **Goal**: what to build or change
- **Motivation**: why it is needed
- **Constraints**: deadlines, compatibility, scope limits
- Any further decision the codebase cannot answer

Done when: the grilling done condition holds and goal, motivation and constraints are each known.

### 2. Load Context

Before exploring code, gather backlog context:

1. **Learnings**: Search for relevant learnings using the CLI. Pass the feature description as the query:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --query "{{FEATURE_DESCRIPTION}}" --limit 3 --json true
   ```
   Phrase `{{FEATURE_DESCRIPTION}}` without `"`, `$` or backticks: it sits inside double quotes. The CLI returns only active learnings, scored by keyword relevance. Use `title` and `reasons` to assess relevance. Read the full learning file only for high-scoring matches that directly affect the idea. Results whose `source` is not `local` belong to another project: read them from their `backlog` path, never edit or archive them.
2. **Active tasks**: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true` — the idea should account for work already in progress to avoid conflicts or duplication.
3. **Pending reports**: scan the titles from `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-list --json true` for related bugs or findings that the idea should address or acknowledge.

If no matches found, skip silently.

Done when: learnings, active tasks and pending reports have been checked.

### 3. Explore the Codebase

Based on the description:
- Search for relevant files that would need changes
- Understand existing patterns and architecture
- Identify dependencies and potential conflicts
- Incorporate insights from learnings found in Step 2

Done when: every file the idea will change is named.

### 4. Generate Idea via CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-create --title "{{TITLE}}" --complexity {{COMPLEXITY}} --body - <<'BODY'
{{IDEA_CONTENT}}
BODY
```

Phrase `{{TITLE}}` without `"`, `$` or backticks: it sits inside double quotes. `{{IDEA_CONTENT}}` is the body only (the CLI writes the frontmatter). Use these sections, in this order — `/flowstate:review-idea` parses them:

```markdown

## Goal
## Context
## Approach        (numbered steps)
## Files to Modify (one bullet per path — what changes)
## Risks & Considerations
## Open Questions  (omit if none)
```

The CLI handles ID assignment, file creation, and placement in `ideas/pending/`.

**Complexity guidelines:**
- **low**: Single file or small change, clear path
- **medium**: Multiple files, some decisions needed
- **high**: Architectural change, many files, unknowns

Done when: the CLI prints the new PLN ID.

### 5. Confirm

```
Created PLN-{{ID}}: {{TITLE}}
  Complexity: {{COMPLEXITY}}
  File: {{BACKLOG}}/ideas/pending/PLN-{{ID}}-{{slug}}.md

Next: /flowstate:review-idea PLN-{{ID}}  — Approve, discard, or revise
```

Done when: the confirmation block is printed.
