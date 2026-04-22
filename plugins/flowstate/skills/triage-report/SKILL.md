---
name: triage-report
description: Triage a pending report by converting it to a task, discarding it, or requesting more info. Use when the user says "triage report", "handle this bug", "convert to task", or when pending reports need attention.
argument-hint: [report ID]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: sonnet
---

# Triage Report

Review a pending report and decide: convert to task, discard, or request more info.

## Arguments

Report identifier (optional): $ARGUMENTS — accepts `RPT-001`, `001`, or `1`.

## Prerequisites

Verify `.backlog/reports/pending/` has reports. If empty, inform the user.

## Workflow

### 1. Identify Report

If `$ARGUMENTS` provided, find in `.backlog/reports/pending/`.

If no argument, list pending reports and ask which to triage.

### 2. Present Summary

```
## RPT-{{ID}}: {{TITLE}}
Type: {{TYPE}} | Severity: {{SEVERITY}} | Created: {{DATE}}

### Summary
...

### Key Details
...
```

### 3. Ask for Decision

1. **Convert to task** — Create a backlog task from this report
2. **Discard** — Not actionable
3. **Needs more info** — Keep pending, note what's missing

### 4a. Convert to Task

```bash
# Create task from report
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "Fix: {{TITLE}}" --priority {{P}} --source "report/RPT-{{ID}}" --criteria '{{CRITERIA_JSON}}' --body -

# Move report to complete
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-move RPT-{{ID}} --status triaged --task-id TSK-{{NEW_ID}}
```

The CLI handles frontmatter updates, file moves, and index updates.

- Priority: derive automatically from severity (critical→P1, high→P2, medium→P3, low→P4). Apply silently. Surface it in the confirm output so the user can override if needed.
- Acceptance criteria: derive from the report (e.g., "Bug no longer reproduces"). Pass as a JSON array: `--criteria '["criterion 1","criterion 2"]'`

Confirm:
```
RPT-{{ID}} triaged → TSK-{{NEW_ID}}: {{TITLE}} ({{PRIORITY}})
/flowstate:start-task TSK-{{NEW_ID}} to begin
```

### 4b. Discard

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-move RPT-{{ID}} --status discarded
```

### 4c. Needs More Info

1. Ask what's missing
2. Add to the report:
   ```markdown
   ## Missing Information
   - [{{TODAY}}] {{what's needed}}
   ```
3. Keep in `reports/pending/`
