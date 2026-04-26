---
name: review-idea
description: Review a pending plan and decide — approve (convert to task), discard, or revise. Use when the user says "review plan", "approve plan", "check the plan", or after generating a plan with /flowstate:idea.
argument-hint: [plan ID]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: sonnet
---

# Review Plan

Review a pending plan and decide whether to approve (convert to task), discard, or revise it.

## Arguments

Plan identifier (optional): $ARGUMENTS — accepts `PLN-001`, `001`, or `1`.

## Prerequisites

Verify `.backlog/ideas/pending/` has plans. If empty, inform the user.

## Workflow

### 1. Identify Plan

If `$ARGUMENTS` provided, find in `.backlog/ideas/pending/`.

If no argument, list pending plans and ask which to review.

### 2. Present Summary

Read the full plan file and present:

```
## PLN-{{ID}}: {{TITLE}}
Complexity: {{COMPLEXITY}} | Created: {{DATE}}

### Goal
{{summary}}

### Approach ({{N}} steps)
1. ...

### Files to Modify
...

### Risks
...
```

### 3. Audit the Plan

Before recommending, audit the plan against the actual codebase. Skip steps that don't apply.

- **Files exist & are accurate**: verify every path under "Files to Modify" exists. Check the relevant code matches what the plan assumes (function names, signatures, surrounding logic).
- **Approach soundness**: read each step critically. Are there missing steps (tests, migrations, types, docs)? Steps that won't compile or contradict existing patterns?
- **Risk gaps**: high/medium-complexity plans with an empty or trivial Risks section are a red flag — propose at least one concrete risk grounded in the code.
- **Conflicts with active work**: scan `.backlog/tasks/active/` and recent commits (`git log --oneline -20`) for overlapping changes that could collide.
- **Related learnings**: search `.backlog/learnings/` for prior insights that should shape the approach.

Keep this internal — surface only the conclusions in the next step.

### 4. Recommend

Emit a single recommendation **before** offering the menu, in this shape:

```
**Recommendation:** {approve | discard | revise}
**Why:** {1-2 lines tying the decision to evidence from step 3}
**Proposed priority:** {P1-P4} (from complexity {{COMPLEXITY}} → {{P}})
**Concerns:**
- {concrete issue grounded in the code, if any}
- {missing step or risk gap, if any}
```

If the recommendation is **revise**, list the specific changes you'd make so the user can accept them in one go.

Then list the override options:

1. **Approve** — Convert this plan into a backlog task
2. **Discard** — This plan is not needed
3. **Revise** — The plan needs changes

Ask the user to confirm the recommendation or pick a different option.

### 5a. Approve

```bash
# Create task from plan
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P}} --source "plan/PLN-{{ID}}" --criteria '{{CRITERIA_JSON}}' --body -

# Move plan to complete
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-move PLN-{{ID}} --status approved --task-id TSK-{{NEW_ID}}
```

The CLI handles frontmatter updates, file moves, and index updates.

- Priority: derive automatically from complexity (low→P3, medium→P2, high→P2). Apply silently. Surface it in the confirm output so the user can override if needed.
- Acceptance criteria: derive from the Approach steps. Pass as a JSON array: `--criteria '["criterion 1","criterion 2"]'`

Confirm:
```
Plan PLN-{{ID}} approved → TSK-{{NEW_ID}}: {{TITLE}} ({{PRIORITY}})
/flowstate:start-task TSK-{{NEW_ID}} to begin
```

### 5b. Discard

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-move PLN-{{ID}} --status discarded
```

Confirm to the user.

### 5c. Revise

1. Discuss needed changes with the user
2. Edit plan in-place (stays in `ideas/pending/`)
3. Add revision note:
   ```markdown
   ## Revision History
   - [{{TODAY}}] {{what changed}}
   ```
