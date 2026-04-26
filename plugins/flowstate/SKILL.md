---
name: flowstate
description: Activate when the project has a .backlog/ directory, or when the user discusses tasks, backlog, ideas, reports, bugs, or learnings. Provides contextual awareness of the flowstate backlog management system.
version: 2.2.3
---

# Flowstate - Backlog Management System

This project uses **Flowstate** for backlog management. All data lives in `.backlog/`.

## Structure

```
.backlog/
├── ideas/pending/         # Implementation ideas awaiting review
├── ideas/complete/        # Approved or discarded ideas
├── reports/pending/       # Bug reports, findings awaiting triage
├── reports/complete/      # Processed reports
├── tasks/pending/         # Tasks to do
├── tasks/active/          # Tasks in progress (multiple allowed)
├── tasks/complete/        # Completed tasks
├── tasks/index.md         # Task index with stats
├── learnings/index.md     # Learnings index
└── learnings/LRN-XXX-*/   # Individual learning directories
```

## CLI Tool

Flowstate includes a CLI for deterministic CRUD operations. Invoke it directly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" <command> [options]
```

All commands support `--json true` for structured output. Use `--body -` to pipe content via stdin.

In the table below, `flowstate` is shorthand for `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js"`.

### CLI Commands

| Command | Description |
|---------|-------------|
| `flowstate setup --project-name <name>` | Create .backlog/ structure |
| `flowstate task-create --title <t> --priority <P> --tags <csv> --body -` | Create task |
| `flowstate task-move <id> --to <active\|complete\|pending>` | Move task between states |
| `flowstate task-update <id> --set <key=value> --log <msg>` | Update task fields |
| `flowstate task-unblock <id> --resolution <text>` | Unblock a task |
| `flowstate task-list [--status <s>] [--json true]` | List tasks |
| `flowstate stats [--json true]` | Get backlog stats |
| `flowstate index-rebuild [--type <tasks\|learnings\|all>]` | Rebuild indexes |
| `flowstate idea-create --title <t> --complexity <c> --body -` | Create idea |
| `flowstate idea-move <id> --status <approved\|discarded> [--task-id <TSK-XXX>]` | Move idea |
| `flowstate report-create --title <t> --type <t> --severity <s> --body -` | Create report |
| `flowstate report-move <id> --status <triaged\|discarded> [--task-id <TSK-XXX>]` | Move report |
| `flowstate learning-create --title <t> --tags <csv> --body - [--task <TSK-XXX>]` | Create learning |
| `flowstate learning-list [--all true] [--json true]` | List learnings (active only by default) |
| `flowstate learning-move <id> --to archived` | Archive a learning |
| `flowstate learning-update <id> [--title <t>] [--tags <csv>] [--body -]` | Update learning fields |
| `flowstate next-id <task\|idea\|report\|learning>` | Get next sequential ID |

## Available Slash Commands

| Command | Description |
|---------|-------------|
| `/flowstate:setup` | Initialize `.backlog/` in the current project (uses CLI) |
| `/flowstate:overview` | Show backlog overview and health |
| `/flowstate:add-task` | Add a new task to the backlog |
| `/flowstate:start-task` | Start working on a task |
| `/flowstate:complete-task` | Mark a task as complete |
| `/flowstate:block-task` | Block a task with a reason |
| `/flowstate:check-task` | Verify task status vs implementation |
| `/flowstate:next-task` | Get a recommendation for what to work on next |
| `/flowstate:idea` | Generate an implementation plan |
| `/flowstate:review-idea` | Review and decide on a pending plan |
| `/flowstate:report` | File a bug report or finding |
| `/flowstate:triage-report` | Triage a pending report |
| `/flowstate:parallel` | Run multiple tasks in parallel |
| `/flowstate:add-learning` | Document an insight or lesson learned |
| `/flowstate:learnings` | Browse the learnings index |
| `/flowstate:condense-learnings` | Deduplicate, archive stale entries, and normalize tags |

## ID Format

- Tasks: `TSK-XXX` (e.g., TSK-001)
- Ideas: `PLN-XXX`
- Reports: `RPT-XXX`
- Learnings: `LRN-XXX`

## Context Loading

Skills that involve starting or planning work (`start-task`, `next-task`, `idea`, `parallel`) automatically load relevant backlog context before acting. This includes:

1. **Learnings** — filtered by tag overlap or keyword match with the task/feature being worked on. Past insights, gotchas, and proven patterns are surfaced inline so they inform decisions without the user having to remember to check.
2. **Active tasks** — listed to show current workload and spot potential overlaps or conflicts.
3. **Pending reports** — scanned for known bugs or findings related to the current scope.

This context is loaded silently — if nothing relevant is found, the skill proceeds without mentioning the absence. The goal is zero-effort awareness: the backlog informs the work automatically.

For ad-hoc browsing outside a skill workflow, use `/flowstate:learnings` to search and drill down into the full learnings index.

## Proactive Behavior

- When you discover a bug or issue while working, suggest `/flowstate:report`
- When you learn something non-obvious, suggest `/flowstate:add-learning`
- Before starting a complex feature, suggest `/flowstate:idea`
- When completing work, check if there are active tasks that match and suggest `/flowstate:complete-task`
