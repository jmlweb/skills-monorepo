---
name: triage-report
description: Triages a pending report into a task, a discard or a request for more info.
disable-model-invocation: true
argument-hint: [report ID]
allowed-tools: [Read, Edit, "Bash(node:*)", Glob, Grep]
model: sonnet
effort: medium
---

# Triage Report

## Arguments

Report identifier (optional): $ARGUMENTS — accepts `RPT-001`, `001`, or `1`.

With an identifier, the run triages that one report. Without one, the run triages every pending report in order.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). List the pending reports with `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-list --json true`; each entry carries its `path`. If the list is empty, inform the user and stop. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Identify Reports

With `$ARGUMENTS`: resolve that one report in the `report-list` output. The queue holds only that report.

Without `$ARGUMENTS`: the queue holds every report in the `report-list` output, sorted by `severity` (critical → high → medium → low), then by ID ascending.

Done when: the queue holds one or more pending report files, in run order.

### 2. Present Summary

Take the head of the queue. Print:

```
## RPT-{{ID}}: {{TITLE}}
Type: {{TYPE}} | Severity: {{SEVERITY}} | Created: {{DATE}}

### Summary
...

### Key Details
...
```

Done when: the summary block is printed.

### 3. Investigate

Before recommending, gather evidence. Skip steps that don't apply to the report type.

- **Reproduce / locate**: grep the codebase for symbols, error messages, or file paths mentioned in the report. Confirm the affected code still exists and the issue is plausible.
- **Check for duplicates**: scan `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --json true` (pending and active entries) for tasks with overlapping title, tags, or source. Note any matches.
- **Cross-reference learnings**: `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --query "{{TITLE}}" --limit 3 --json true` (phrase `{{TITLE}}` without `"`, `$` or backticks: it sits inside double quotes) for related insights that explain the behavior or suggest a fix. Results whose `source` is not `local` belong to another project: read them from their `backlog` path, never edit or archive them.
- **Assess completeness**: does the report contain enough to act on (repro steps, expected vs actual, scope)? List what's missing if not.

Surface only the conclusions, in the next step.

Done when: each applicable check has a conclusion.

### 4. Recommend

Emit a single recommendation **before** offering the menu, in this shape:

```
**Recommendation:** {convert to task | discard | needs more info}
**Why:** {1-2 lines tying the decision to evidence from step 3}
**Proposed priority:** {P1-P4} (from severity {{SEVERITY}} → {{P}})
**Possible duplicate of:** {TSK-XXX}  ← only if found
```

Then list the override options:

- **A · Convert to task** — Create a backlog task from this report
- **B · Discard** — Not actionable
- **C · Needs more info** — Keep pending, note what's missing
- **D · Stop** — End the run now; this report and the rest of the queue stay pending

Ask the user to confirm the recommendation or pick a different option. A plain "yes" accepts the recommendation.

Done when: the user has confirmed the recommendation, picked another option, or chosen stop.

### 5. Apply the Decision

Run the branch the user chose. Stop applies nothing and goes to step 7.

#### 5a. Convert to Task

```bash
# Create task from report (stdin carries the report's summary + key details)
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "Fix: {{TITLE}}" --priority {{P}} --source "report/RPT-{{ID}}" --criteria '{{CRITERIA_JSON}}' --body - <<'BODY'
{{REPORT_SUMMARY_AND_DETAILS}}
BODY

# Move report to complete (TSK-{{NEW_ID}} comes from the task-create output above)
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-move RPT-{{ID}} --status triaged --task-id TSK-{{NEW_ID}}
```

Phrase `{{TITLE}}` without `"`, `$` or backticks: it sits inside double quotes. The CLI handles frontmatter updates, file moves, and index updates.

- Priority: derive automatically from severity (critical→P1, high→P2, medium→P3, low→P4). Apply silently. Surface it in the confirm output so the user can override if needed.
- Acceptance criteria: derive from the report (e.g., "Bug no longer reproduces"). Pass as a JSON array: `--criteria '["criterion 1","criterion 2"]'`

Confirm:
```
RPT-{{ID}} triaged → TSK-{{NEW_ID}}: {{TITLE}} ({{PRIORITY}})
/flowstate:start-task TSK-{{NEW_ID}} to begin
```

Done when: the CLI prints the new TSK ID and `report-move` exits 0.

#### 5b. Discard

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-move RPT-{{ID}} --status discarded
```

Done when: `report-move` exits 0.

#### 5c. Needs More Info

1. Ask what's missing
2. Append to the end of the report file with the Edit tool (frontmatter untouched):
   ```markdown
   ## Missing Information
   - [{{TODAY}}] {{what's needed}}
   ```
3. The file stays in `reports/pending/` and joins the run's skipped list, so later steps don't present it again

Done when: the report file ends with a dated Missing Information entry.

### 6. Next Report

Drop from the queue every report on the skipped list. If the queue still holds reports, return to step 2 with the head of the queue. Otherwise go to step 7.

Done when: the queue is empty or stop was chosen.

### 7. Closing Summary

A single-report run ends with the confirm output of step 5a, 5b or 5c. A multi-report run ends with one line per report, in run order, then the pending count:

```
RPT-003 → TSK-050 (P2)
RPT-001 discarded
RPT-005 needs info
RPT-006 not reached
4 still pending in reports/pending/
```

Done when: the outcome of every report in the queue is printed and the pending count matches the files left in `reports/pending/`.
