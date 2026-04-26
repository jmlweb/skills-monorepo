---
name: next-task
description: Analyze the backlog and recommend the best task to start next. Use when the user asks "what should I work on?", "next task", "what's the priority?", or needs help deciding between multiple pending items.
allowed-tools: [Read, Bash, Glob, Grep]
model: sonnet
effort: medium
---

# Next Task

Analyze the backlog and recommend the best task to start next.

## Prerequisites

Verify `.backlog/` exists.

## Workflow

### 1. Read State

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status pending --json true
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true
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

### 3. Load Context for Top Pick

Once the top candidate is identified:

1. **Learnings**: Search for relevant learnings using the CLI. Pass the task's tags and its title + description for maximum keyword coverage:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{TOP_PICK_TAGS}}" --query "{{TOP_PICK_TITLE}} {{TOP_PICK_DESCRIPTION_FIRST_LINE}}" --limit 3 --json true
   ```
   The CLI returns only active learnings, scored by tag match and keyword relevance. Use `title` and `reasons` to summarize relevance. Only read the full learning file if the user asks for details.
2. **Pending reports**: Scan `.backlog/reports/pending/` for anything related to the top pick's scope.

If no matches, skip silently.

### 4. Present

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

Show up to 5 alternatives. If more pending tasks exist, note: "… and N more pending."

Reply with a task ID/number to start it, or anything else to keep browsing.
```

### 5. Handle Response

- **ID or number** (top pick or any alternative): Move that task to active (same as `/flowstate:start-task`) and proceed implementing
- **Question about a task**: Answer it without moving anything; the user can reply with an ID afterwards
- **"no" / silence / unrelated**: Do nothing — user will re-invoke when ready

## Edge Cases

- **All blocked**: Show blockers, suggest resolving or `/flowstate:add-task`
- **No pending**: Suggest `/flowstate:add-task`
- **Many same-priority**: Rank by secondary factors, explain reasoning
