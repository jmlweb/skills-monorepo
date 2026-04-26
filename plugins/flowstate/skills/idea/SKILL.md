---
name: idea
description: Generate a detailed implementation plan for a feature or change before coding begins. Use when the user says "plan this", "how should we implement", "design approach", or when a task needs architectural thinking.
argument-hint: [feature description]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: sonnet
effort: high
---

# Generate Plan

Create a detailed implementation plan for a feature or change, saved for later review.

## Arguments

Feature description (optional): $ARGUMENTS

## Prerequisites

Verify `.backlog/` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Gather Context

If `$ARGUMENTS` provided, use it as the starting point. Otherwise ask:

1. **What do you want to build or change?**
2. **Why is this needed?**
3. **Any constraints?** (deadlines, compatibility, etc.)

### 2. Load Context

Before exploring code, gather backlog context:

1. **Learnings**: Search for relevant learnings using the CLI. Pass the feature description as the query:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --query "{{FEATURE_DESCRIPTION}}" --limit 3 --json true
   ```
   The CLI returns only active learnings, scored by keyword relevance. Use `title` and `reasons` to assess relevance. Read the full learning file only for high-scoring matches that directly affect the plan.
2. **Active tasks**: Read `.backlog/tasks/active/` — the plan should account for work already in progress to avoid conflicts or duplication.
3. **Pending reports**: Scan `.backlog/reports/pending/` for related bugs or findings that the plan should address or acknowledge.

If no matches found, skip silently.

### 3. Explore the Codebase

Based on the description:
- Search for relevant files that would need changes
- Understand existing patterns and architecture
- Identify dependencies and potential conflicts
- Incorporate insights from learnings found in Step 2

### 4. Generate Plan via CLI

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-create --title "{{TITLE}}" --complexity {{COMPLEXITY}} --body -
{{PLAN_CONTENT}}
BODY
```

The CLI handles ID assignment, file creation, and placement in `ideas/pending/`.

**Complexity guidelines:**
- **low**: Single file or small change, clear path
- **medium**: Multiple files, some decisions needed
- **high**: Architectural change, many files, unknowns

### 5. Confirm

```
Created PLN-{{ID}}: {{TITLE}}
  Complexity: {{COMPLEXITY}}
  File: .backlog/ideas/pending/PLN-{{ID}}-{{slug}}.md

Next: /flowstate:review-idea PLN-{{ID}}  — Approve, discard, or revise
```
