---
name: check-task
description: Reports whether a task's declared status matches what the codebase implements, for one task or the whole backlog. Use when the user says "check task status", "verify implementation", "is this task really done", or "backlog health check". Not for finishing a task (use complete-task).
argument-hint: [task ID or number]
allowed-tools: [Read, Bash, Glob, Grep]
model: sonnet
effort: medium
---

# Check Task

## Arguments

Task identifier (optional): $ARGUMENTS — accepts `TSK-001`, `001`, or `1`.
Also accepts `pending` or `active` to batch-check only that status group.
Without argument, runs batch mode on all pending and active tasks.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists.

## Workflow

### 1. Identify Task(s)

If `$ARGUMENTS` provided, find the task in `tasks/pending/`, `tasks/active/`, or `tasks/complete/`.

If `$ARGUMENTS` is `pending` or `active`, batch-check only that status group.

If no argument, run batch mode on all pending + active tasks. If total exceeds 8, warn the user and ask to confirm or narrow with `pending`/`active`.

Fetch task data:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --json true
```

Done when: the task list to check is fixed (confirmed by the user when it exceeds 8).

### 2. Read Task File

Parse: status from frontmatter, acceptance criteria (checked/unchecked), files mentioned in description or notes.

Done when: status, criteria and referenced files are extracted for every task in scope.

### 3. Verify Implementation

For each acceptance criterion:
1. Search the codebase for implementations matching the criterion
2. Check if referenced files exist and contain expected changes
3. Run relevant checks if applicable (imports, function existence)

Done when: every criterion has a found/not-found verdict with a file or command as proof.

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

Done when: each task has one action from the table.

### 5. Report

**Single task:**
```

Done when: the report block is printed.

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
- Tick criteria that are met in code through the CLI, naming the file or test that proves each one (the CLI owns checkboxes, frontmatter and `index.md`):

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update {{ID}} --check {{N1,N2}} --evidence '{"{{N1}}":"{{FILE_OR_TEST}} → {{WHAT_IT_SHOWS}}"}'
```
- Suggest reopening if marked complete but broken
