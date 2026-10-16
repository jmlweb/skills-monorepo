---
name: overview
description: Shows backlog stats, active work and health warnings. Use when the user asks "backlog status", "what's going on", "show tasks", or "project overview". Not for choosing what to work on (use next-task).
allowed-tools: [Read, "Bash(node:*)"]
model: haiku
---

# Backlog Status

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, tell the user to run `/flowstate:setup`. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Fetch Stats and Task Data

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" stats --json true
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --json true
```

Done when: both commands returned JSON.

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
| Ideas (pending) | {{N}} |
| Reports (pending) | {{N}} |
| Learnings | {{N}} |

### Active Tasks
| ID | Title | Started | Tags |
|----|-------|---------|------|

### Pending Tasks (top 10 by priority)
| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|

If more than 10 pending tasks exist, add a footer: "… and N more. Use `task-list --status pending --json true` for the full list."

### Pending Ideas
| ID | Title | Complexity | Created |
|----|-------|------------|---------|

### Pending Reports
| ID | Title | Type | Severity | Created |
|----|-------|------|----------|---------|

### Recently Completed (last 5)
| ID | Title | Completed |
|----|-------|-----------|
```

Done when: the Quick Stats table and every non-empty section are printed.

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

**Index drift**: the per-status counts in `{{BACKLOG}}/tasks/index.md` differ from the `stats` JSON. Report it and go to Step 4.

Done when: each stale, blocked, imbalance and drift condition is reported or found absent.

### 4. Rebuild Index (only when Step 3 found drift)

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild
```

Done when: the CLI exits 0, or Step 3 found no drift and this step was skipped.

### 5. Quick Actions

```
/flowstate:next-task       — Get a recommendation
/flowstate:add-task        — Add new work
/flowstate:review-idea     — Review pending ideas
/flowstate:triage-report   — Triage pending reports
```

Done when: the quick-actions block is printed.
