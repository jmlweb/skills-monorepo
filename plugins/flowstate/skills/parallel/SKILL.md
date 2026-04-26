---
name: parallel
description: Execute multiple independent backlog tasks simultaneously using subagents with worktree isolation. Use when the user says "run tasks in parallel", "do these at the same time", or when multiple non-overlapping tasks can be worked on concurrently.
argument-hint: [task IDs separated by comma]
allowed-tools: [Read, Write, Bash, Glob, Grep, Agent]
model: sonnet
effort: medium
---

# Parallel Tasks

Execute multiple independent backlog tasks simultaneously using subagents with worktree isolation.

## Arguments

$ARGUMENTS — comma-separated task IDs (e.g., `1,2,3` or `TSK-001,TSK-002`). Optional.

## Prerequisites

Verify `.backlog/` exists.

## Workflow

### 1. Identify Candidates

If `$ARGUMENTS` provided, parse comma-separated IDs and validate each exists in `tasks/pending/` or `tasks/active/` and is not blocked.

If no argument:
- List all pending non-blocked tasks
- Parse file references from each task
- Identify independent groups (no overlapping files)

### 2. Detect File Overlaps (Informational)

Parse each task for file references. Note overlaps — with worktree isolation these won't conflict at runtime but may need manual merge afterward.

### 3. Present Selection

```
## Independent Tasks

| ID | Title | Priority | Files | Notes |
|----|-------|----------|-------|-------|

Recommended groups:
- Group A: TSK-001 + TSK-002 (no overlaps)

Which tasks? (comma-separated)
```

### 4. Start All Selected Tasks

For each selected task, activate it via CLI:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to active
```

The CLI handles frontmatter updates, file moves, and index updates.

### 5. Load Context for Subagents

Run a single combined search using all unique tags and titles from the selected tasks:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{ALL_UNIQUE_TAGS}}" --query "{{ALL_TITLES_CONCATENATED}}" --limit 5 --json true
```

Distribute results to subagents by tag overlap: include a learning in a subagent's prompt if its tags or reasons reference terms from that task's title or tags. A single learning may appear in multiple prompts if relevant.

Also scan `.backlog/reports/pending/` once for any reports related to the selected tasks' scope.

### 6. Launch Subagents

Use the Agent tool to launch ALL subagents in a **single message** for true parallel execution.

Each subagent gets `isolation: "worktree"`.

**Subagent prompt:**

```
Complete Task TSK-{{ID}}: {{TITLE}}

## Task Description
{{DESCRIPTION}}

## Acceptance Criteria
{{CRITERIA}}

## Relevant Learnings              ← only if matches found
- LRN-XXX: {{TITLE}}
  {{INSIGHT_SUMMARY}}

## Known Issues                    ← only if related reports found
- RPT-XXX: {{TITLE}} ({{SEVERITY}})

## Instructions
1. Read project documentation (README, CLAUDE.md, etc.) first
2. Apply the learnings above — they capture past mistakes and proven patterns
3. Read existing files before modifying
4. Implement each acceptance criterion
5. Verify changes work (build, lint, test as applicable)
6. Create a commit referencing TSK-{{ID}}
```

### 7. Collect Results

```
## Parallel Execution Complete

| Task | Result | Branch/Worktree |
|------|--------|-----------------|

### Next Steps
- Review changes from each worktree
- /flowstate:complete-task for successful tasks
- /flowstate:block-task for failed tasks
```

## Error Handling

- Agent fails: mark task as blocked, continue others
- All fail: summarize errors, suggest reviewing task definitions
