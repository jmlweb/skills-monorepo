---
name: learnings
description: Browse and search the learnings index for relevant past insights. Use when the user says "check learnings", "what did we learn about", "search knowledge", or at the start of a work session to review insights.
argument-hint: [search term or tag]
allowed-tools: [Read, Bash, Glob, Grep]
model: haiku
---

# Browse Learnings

View the learnings index and search for relevant past insights.

## Arguments

Search term (optional): $ARGUMENTS

## Prerequisites

Verify `.backlog/learnings/` exists.

## Workflow

### 1. Search or Browse

**If `$ARGUMENTS` provided** — go straight to the CLI search; do NOT read `index.md` first:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --query "{{SEARCH_TERM}}" --limit 10 --json true
```

- **Exactly 1 result** → skip the table; jump directly to Step 2 (Drill Down) and display the full document.
- **Multiple results** → present:

  ```
  ## Search Results for "{{TERM}}"

  | ID | Title | Tags | Score | Date |
  |----|-------|------|-------|------|

  Enter a learning ID to read the full document.
  ```

- **Zero results** → say so and suggest broadening the search or running without arguments.

**If no `$ARGUMENTS`** — read `.backlog/learnings/index.md` and display:

```
## Learnings Index ({{N}} entries)

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|

Enter a learning ID to read the full document, or a search term to filter.
```

### 2. Drill Down

When the user selects a learning ID (or when a single search result auto-opened):

- Read the full `LRN-XXX-slug/index.md`
- Display the content
- List attachments in the directory

```
## LRN-{{ID}}: {{TITLE}}

### Context
...

### Insight
...

### Application
...

### Attachments
- screenshot.png
```

## Usage Tips

- Run `/flowstate:learnings` at the start of a work session to review recent insights
- Search by tag to find relevant learnings for your current task
