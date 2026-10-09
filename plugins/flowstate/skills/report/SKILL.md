---
name: report
description: Files a structured bug, finding, improvement or security report for later triage. Use when the user says "found a bug", "report issue", "file a finding", "security concern", or when something unexpected is observed. Not for planned work (use add-task).
argument-hint: [report description]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# File Report

## Arguments

Report description (optional): $ARGUMENTS

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, tell the user to run `/flowstate:setup` first.

## Workflow

### 1. Determine Report Type

If `$ARGUMENTS` provided, infer the type. Otherwise ask:

| Type | When to use |
|------|-------------|
| bug | Something is broken or behaving incorrectly |
| finding | A discovery or observation worth documenting |
| improvement | An enhancement or optimization opportunity |
| security | A security vulnerability or concern |

Done when: type is one of bug, finding, improvement, security.

### 2. Gather Details

**All types:** Title, Summary, Details

**Bug:** Steps to Reproduce, Expected vs Actual, Error messages/logs

**Finding:** Where found, Evidence, Impact

**Improvement:** Current behavior, Proposed change, Expected benefit

**Security:** Attack vector, Affected components, Severity

Done when: every field listed for the type has content.

### 3. Determine Severity

| Severity | Criteria |
|----------|----------|
| critical | System broken, data loss, security breach |
| high | Major feature broken, significant impact |
| medium | Partially broken, workaround exists |
| low | Minor issue, cosmetic, edge case |

Done when: severity is one of critical, high, medium, low.

### 4. Generate Report via CLI

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" report-create --title "{{TITLE}}" --type {{TYPE}} --severity {{SEVERITY}} --body -
{{REPORT_CONTENT}}
BODY
```

The CLI assigns the ID and places the file in `reports/pending/`. Include only sections that apply to the type.

Done when: the CLI prints the new RPT ID.

### 5. Confirm

```
Filed RPT-{{ID}}: {{TITLE}}
  Type: {{TYPE}} | Severity: {{SEVERITY}}
  File: {{BACKLOG}}/reports/pending/RPT-{{ID}}-{{slug}}.md

Next: /flowstate:triage-report RPT-{{ID}}
```
