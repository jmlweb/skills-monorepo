---
name: overview
description: Show a comprehensive backlog overview with stats, active work, and health warnings. Use when the user asks "backlog status", "what's going on", "show tasks", "project overview", or wants to see the current state of all work.
argument-hint: [summary]
allowed-tools: [Read, Bash, Glob, Grep]
model: haiku
---

# Backlog Status

Display the current state of the backlog with stats, active work, and health warnings.

## Arguments

$ARGUMENTS — ignored; this command takes no arguments.

## Prerequisites

Verify `.backlog/` exists. If not, tell the user to run `/flowstate:setup`.

## Workflow

### 1. Fetch Stats and Task Data

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" stats --json true
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --json true
```

### 2. Display

```
## {{PROJECT}} - Backlog Status

### Quick Stats
| Metric | Count |
|--------|-------|
| Pending | {{N}} |
| Active | {{N}} |
| Blocked | {{N}} |
| Complete | {{N}} |
| Plans (pending) | {{N}} |
| Reports (pending) | {{N}} |
| Learnings | {{N}} |

### Active Tasks
| ID | Title | Started | Tags |
|----|-------|---------|------|

### Pending Tasks (top 10 by priority)
| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|

If more than 10 pending tasks exist, add a footer: "… and N more. Use `task-list --status pending --json true` for the full list."

### Pending Plans
| ID | Title | Complexity | Created |
|----|-------|------------|---------|

### Pending Reports
| ID | Title | Type | Severity | Created |
|----|-------|------|----------|---------|

### Recently Completed (last 5)
| ID | Title | Completed |
|----|-------|-----------|
```

### 3. Warnings

**Stale active tasks** (active > 3 days):
```
WARNING: TSK-XXX active since YYYY-MM-DD (N days)
  /flowstate:check-task TSK-XXX or /flowstate:block-task TSK-XXX
```

**Blocked tasks**: List with reasons.

**Priority imbalance** (> 3 P1/P2 tasks):
```
NOTE: {{N}} high-priority tasks — consider reprioritizing
```

**Index drift** (counts don't match disk): Offer to rewrite `tasks/index.md`.

### 4. Rebuild Index (only if drift detected)

If the stats from the CLI don't match what's in `tasks/index.md`, rebuild:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild
```

Skip this step if counts match — avoids unnecessary file reads.

### 5. Quick Actions

```
/flowstate:next-task       — Get a recommendation
/flowstate:add-task        — Add new work
/flowstate:review-idea     — Review pending plans
/flowstate:triage-report   — Triage pending reports
```
