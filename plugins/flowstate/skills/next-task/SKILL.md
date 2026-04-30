---
name: next-task
description: Analyze the backlog and recommend the best task to start next, or up to 3 tasks if they can run in parallel. Use when the user asks "what should I work on?", "next task", "what's the priority?", or needs help deciding between multiple pending items.
allowed-tools: [Read, Bash, Glob, Grep]
model: sonnet
effort: medium
---

# Next Task

Analyze the backlog and recommend the best task to start next. When the highest-scoring candidates are independent (no shared files, no `depends-on` overlap), suggest up to 3 of them as a parallel group so the user can hand them off to `/flowstate:parallel`.

## Prerequisites

Verify `.backlog/` exists.

## Workflow

### 1. Read State

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status pending --json true
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true
```

If pending tasks is empty, before falling back, also check pending ideas:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-list --status pending --json true
```

### 2. Score Candidates

For each pending non-blocked task:

| Factor | Weight | Criteria |
|--------|--------|----------|
| Priority | High | P1 > P2 > P3 > P4 |
| Unblocked | High | No `blocked-by` field |
| Unblocks others | Medium | Other tasks list this in `depends-on` |
| Tag affinity | Low | Shares tags with recently completed tasks |
| Age | Low | Older tasks get slight preference |

### 3. Detect Parallel Group

Take the top-scoring candidate plus the next 1–2 highest-scoring ones and check whether they can run together. The group is parallel-safe only if **all** of these hold:

- No task in the group lists another task in the group via `depends-on`
- No shared file references — parse each task's Description and Acceptance Criteria for path-like tokens (e.g. `src/foo.ts`, `packages/x/`, `*.json`) and require disjoint sets. When a task gives only directory hints, treat any overlap (same directory or ancestor) as a conflict
- Tags and scope don't obviously collide on the same module (e.g. two tasks both tagged `auth` editing the same area is a conflict even if exact paths differ)

Shrink the group from 3 → 2 → 1 until it satisfies the rules. If only the top pick survives, fall through to the single-pick presentation.

### 4. Load Context

Run a single learning search covering the whole group (top pick + any parallel companions) so context loading stays one CLI call:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{ALL_GROUP_TAGS}}" --query "{{ALL_GROUP_TITLES_AND_FIRST_LINES}}" --limit 5 --json true
```

The CLI returns only active learnings, scored by tag match and keyword relevance. Use `title` and `reasons` to summarize relevance. Attribute each learning to the task(s) whose tags/title it overlaps with. Only read the full learning file if the user asks for details.

Also scan `.backlog/reports/pending/` once for anything related to any task in the group.

If no matches, skip silently.

### 5. Present

**If the parallel group has 2–3 tasks:**

```
## Next Task Recommendation

### Parallel Group ({{N}} tasks)
These are independent and can run together via `/flowstate:parallel`:

| ID | Title | Priority | Tags |
|----|-------|----------|------|
| TSK-{{ID1}} | {{TITLE1}} | {{P1}} | {{TAGS1}} |
| TSK-{{ID2}} | {{TITLE2}} | {{P2}} | {{TAGS2}} |

Why this group: {{REASONING — priorities, no file overlap, unblocks others, etc.}}

### Relevant Learnings          ← only if matches found
- LRN-XXX (TSK-{{ID}}): {{TITLE}} — {{key insight}}

### Alternatives (top 5)
| ID | Title | Priority | Notes |
|----|-------|----------|-------|

Reply:
- `parallel` / `all` / `yes` — start all {{N}} via `/flowstate:parallel`
- a single ID/number — start just that one
- anything else — keep browsing
```

**If only a single pick is viable (no parallel-safe companions):**

```
## Next Task Recommendation

### Top Pick: TSK-{{ID}}
**{{TITLE}}** ({{PRIORITY}}, tags: {{TAGS}})
Why: {{REASONING}}

### Relevant Learnings          ← only if matches found
- LRN-XXX: {{TITLE}} — {{key insight}}

### Alternatives (top 5)
| ID | Title | Priority | Notes |
|----|-------|----------|-------|

Reply with a task ID/number to start it, or anything else to keep browsing.
```

In both forms, show up to 5 alternatives. If more pending tasks exist, note: "… and N more pending."

### 6. Handle Response

- **`parallel` / `all` / `yes` (when a group was offered)**: Hand off to `/flowstate:parallel` with the group's task IDs as arguments
- **Single ID or number** (top pick, group member, or any alternative): Move that task to active (same as `/flowstate:start-task`) and proceed implementing
- **Comma-separated IDs**: Hand off to `/flowstate:parallel` with those IDs
- **Question about a task**: Answer it without moving anything; the user can reply with an ID afterwards
- **"no" / silence / unrelated**: Do nothing — user will re-invoke when ready

## Edge Cases

- **All blocked**: Show blockers, suggest resolving or `/flowstate:add-task`
- **No pending tasks, but pending ideas exist**: Surface the top 3 pending ideas as candidates and offer to promote one. Present:

  ```
  ## No Pending Tasks

  No pending tasks, but {{N}} pending idea(s) ready for review:

  | ID | Title | Complexity | Created |
  |----|-------|------------|---------|

  Reply with an idea ID to review (`/flowstate:review-idea <ID>`) and promote it to a task, or run `/flowstate:add-task` to add a new task directly.
  ```

  If the user picks an idea, hand off to `/flowstate:review-idea` rather than auto-promoting — review keeps a human in the loop for scoping decisions.
- **No pending tasks and no pending ideas**: Suggest `/flowstate:add-task` or `/flowstate:idea`
- **Many same-priority**: Rank by secondary factors, explain reasoning
