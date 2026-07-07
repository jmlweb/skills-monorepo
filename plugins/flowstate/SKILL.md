---
name: flowstate
description: Activate when the project has a .backlog/ directory, or when the user discusses tasks, backlog, ideas, reports, bugs, or learnings. Provides contextual awareness of the flowstate backlog management system.
version: 2.6.0
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
| `flowstate task-block <id> --reason <text>` | Block a task (never set `status: blocked` by hand) |
| `flowstate task-unblock <id> --resolution <text>` | Unblock a task |
| `flowstate task-list [--status <s>] [--json true]` | List tasks |
| `flowstate task-condense <id\|--all>` | Trim Notes + middle Progress Log of complete tasks |
| `flowstate task-compress <id> --body -` | Replace complete-task body with validated compressed version |
| `flowstate task-doctor` | Reconcile task frontmatter status with folder location |
| `flowstate stats [--json true]` | Get backlog stats |
| `flowstate index-rebuild [--type <tasks\|learnings\|all>]` | Rebuild indexes |
| `flowstate idea-create --title <t> --complexity <c> --body -` | Create idea |
| `flowstate idea-list [--status <pending\|complete\|all>]` | List ideas (pending by default) |
| `flowstate idea-move <id> --status <approved\|discarded> [--task-id <TSK-XXX>]` | Move idea |
| `flowstate report-create --title <t> --type <t> --severity <s> --body -` | Create report |
| `flowstate report-move <id> --status <triaged\|discarded> [--task-id <TSK-XXX>]` | Move report |
| `flowstate learning-create --title <t> --tags <csv> --body - [--task <TSK-XXX>]` | Create learning |
| `flowstate learning-search [--tags <csv>] [--query <text>] [--limit <n>]` | Search active learnings by tags/keywords |
| `flowstate learning-list [--all true] [--json true]` | List learnings (active only by default) |
| `flowstate learning-move <id> --to archived` | Archive a learning |
| `flowstate learning-update <id> [--title <t>] [--tags <csv>] [--body -]` | Update learning fields |
| `flowstate learning-compress <id> --body -` | Replace learning body with validated compressed version |
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
| `/flowstate:condense-tasks` | Trim Notes and middle Progress Log entries from completed tasks |
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
- Before starting a complex feature, suggest `/flowstate:idea`
- When completing work, check if there are active tasks that match and suggest `/flowstate:complete-task`

### Capture Learnings As They Happen

Don't wait until task completion — capture relevant discoveries the moment they surface, in auto-draft mode (no questions). Concrete triggers:

- A fix worked and the **why** was non-obvious — surprising root cause, hidden dependency, undocumented behavior
- A first attempt failed and the failure revealed a constraint worth remembering ("X doesn't work because Y")
- You confirmed a pattern that future work in this area should reuse
- You discovered a gotcha, footgun, or counterintuitive default
- You read docs/source and found something that contradicts what the codebase or training data implies
- The user states a preference or rule that should outlive this conversation (route those toward `/flowstate:add-learning` even if the model would also save it as memory)

When a trigger fires, invoke `/flowstate:add-learning` immediately using auto-draft mode — it derives every field from context without asking, dedupes against existing learnings, and links to the active task automatically. Surface the captured `LRN-XXX` inline so the user can edit or delete if the signal was wrong. **Do not ask permission to capture** — a stale learning is cheap to delete; a missed insight is gone.

Skip the capture for: routine work, obvious-from-the-code facts, restatements of existing learnings (the dedupe check will catch those anyway), and anything tied only to this conversation's transient state.
