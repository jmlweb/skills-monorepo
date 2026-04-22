---
name: check-task
description: Verify that a task's declared status matches the actual codebase implementation. Use when the user says "check task status", "verify implementation", or during backlog health checks. Supports single-task and batch mode.
argument-hint: [task ID or number]
allowed-tools: [Read, Bash, Glob, Grep]
model: sonnet
---

# Check Task

Verify that a task's declared status accurately reflects the actual implementation.

## Arguments

Task identifier (optional): $ARGUMENTS — accepts `TSK-001`, `001`, or `1`.
Also accepts `pending` or `active` to batch-check only that status group.
Without argument, runs batch mode on all pending and active tasks.

## Prerequisites

Verify `.backlog/` exists.

## Workflow

### 1. Identify Task(s)

If `$ARGUMENTS` provided, find the task in `tasks/pending/`, `tasks/active/`, or `tasks/complete/`.

If `$ARGUMENTS` is `pending` or `active`, batch-check only that status group.

If no argument, run batch mode on all pending + active tasks. If total exceeds 8, warn the user and ask to confirm or narrow with `pending`/`active`.

Fetch task data:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --json true
```

### 2. Read Task File

Parse: status from frontmatter, acceptance criteria (checked/unchecked), files mentioned in description or notes.

### 3. Verify Implementation

For each acceptance criterion:
1. Search the codebase for implementations matching the criterion
2. Check if referenced files exist and contain expected changes
3. Run relevant checks if applicable (imports, function existence)

### 4. Compare Status vs Reality

| Declared | Reality | Action |
|----------|---------|--------|
| pending | Not implemented | Correct |
| pending | Fully implemented | Should complete |
| pending | Partially done | Update checkboxes |
| active | Partially done | Update checkboxes |
| active | Fully done | Should complete |
| complete | Still works | Correct |
| complete | Broken/missing | Should reopen |
| blocked | Blocker resolved | Should unblock |

### 5. Report

**Single task:**
```
## TSK-{{ID}} Status Check

Current: {{STATUS}} (in {{DIRECTORY}})

| # | Criterion | Declared | Reality | Match |
|---|-----------|----------|---------|-------|
| 1 | Query works | [ ] | Implemented in src/db.ts:45 | MISMATCH |
| 2 | Route renders | [ ] | Not found | OK |

Recommended: {{action}}
```

**Batch mode:**
```
## Backlog Health Check

| Task | Status | Reality | Action Needed |
|------|--------|---------|---------------|
| TSK-001 | pending | done | Complete it |
| TSK-002 | blocked | resolved | Unblock it |

Summary: {{N}} tasks need attention
```

### 6. Offer Fixes

- `/flowstate:complete-task` if fully implemented
- Update checkboxes if partially complete
- Suggest reopening if marked complete but broken
