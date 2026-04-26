---
name: triage-report
description: Triage a pending report by converting it to a task, discarding it, or requesting more info. Use when the user says "triage report", "handle this bug", "convert to task", or when pending reports need attention.
argument-hint: [report ID]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: sonnet
effort: medium
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

### 3. Investigate

Before recommending, gather evidence. Skip steps that don't apply to the report type.

- **Reproduce / locate**: grep the codebase for symbols, error messages, or file paths mentioned in the report. Confirm the affected code still exists and the issue is plausible.
- **Check for duplicates**: scan `.backlog/tasks/pending/` and `.backlog/tasks/active/` for tasks with overlapping title, tags, or source. Note any matches.
- **Cross-reference learnings**: search `.backlog/learnings/` for related insights that explain the behavior or suggest a fix.
- **Assess completeness**: does the report contain enough to act on (repro steps, expected vs actual, scope)? List what's missing if not.

Keep this internal — surface only the conclusions in the next step.

### 4. Recommend

Emit a single recommendation **before** offering the menu, in this shape:

```
**Recommendation:** {convert to task | discard | needs more info}
**Why:** {1-2 lines tying the decision to evidence from step 3}
**Proposed priority:** {P1-P4} (from severity {{SEVERITY}} → {{P}})
**Possible duplicate of:** {TSK-XXX}  ← only if found
```

Then list the override options:

1. **Convert to task** — Create a backlog task from this report
2. **Discard** — Not actionable
3. **Needs more info** — Keep pending, note what's missing

Ask the user to confirm the recommendation or pick a different option.

### 5a. Convert to Task

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

### 5b. Discard

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-move RPT-{{ID}} --status discarded
```

### 5c. Needs More Info

1. Ask what's missing
2. Add to the report:
   ```markdown
   ## Missing Information
   - [{{TODAY}}] {{what's needed}}
   ```
3. Keep in `reports/pending/`
