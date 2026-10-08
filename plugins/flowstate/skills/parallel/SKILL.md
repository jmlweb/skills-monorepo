---
name: parallel
description: Execute multiple independent backlog tasks simultaneously using subagents with worktree isolation. Use when the user says "run tasks in parallel", "do these at the same time", "work on these tasks concurrently", or when multiple non-overlapping tasks can be worked on concurrently.
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

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists).

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

Then commit the moves, but only if `{{BACKLOG}}` is inside the repo's tracked tree (e.g. `{{BACKLOG}}` ends in `.backlog` and is not git-ignored). A private backlog (outside the repo or git-ignored) has nothing to commit: skip this step. It is also shared by every worktree, so subagents never see stale `pending/` copies. For a tracked backlog, worktrees branch from `HEAD`, so uncommitted moves leave subagents seeing stale `pending/` copies and cause merge conflicts later. The pathspec keeps unrelated staged work out of this commit:

```bash
git add "{{BACKLOG}}" && git commit -m "chore(backlog): start {{IDS}}" -- "{{BACKLOG}}"
```

### 5. Load Context for Subagents

Run a single combined search using all unique tags and titles from the selected tasks:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{ALL_UNIQUE_TAGS}}" --query "{{ALL_TITLES_CONCATENATED}}" --limit 5 --json true
```

Distribute results to subagents by tag overlap: include a learning in a subagent's prompt if its tags or reasons reference terms from that task's title or tags. A single learning may appear in multiple prompts if relevant.

Also scan `{{BACKLOG}}/reports/pending/` once for any reports related to the selected tasks' scope.

### 6. Launch Subagents

Use the Agent tool to launch ALL subagents in a **single message** for true parallel execution.

Each subagent gets `isolation: "worktree"`.

If several tasks will each create sequentially numbered files (ADRs, migrations), reserve the numbers up front and state each subagent's number in its prompt — otherwise they all pick the same next number.

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

## Reserved Numbers                ← only if numbers were reserved
- Use {{e.g. ADR 0007}} — other parallel tasks hold the neighbouring numbers

## Instructions
1. Read project documentation (README, CLAUDE.md, etc.) first
2. Apply the learnings above — they capture past mistakes and proven patterns
3. Implement each acceptance criterion
4. Verify changes work (build, lint, test as applicable)
5. Do NOT modify anything under the backlog directory and do NOT run flowstate CLI commands — other agents run in parallel, and the coordinator owns backlog state
6. Create a commit referencing TSK-{{ID}}
7. End your final report with a `## Learnings` section: one entry per non-obvious root cause, undocumented behavior, gotcha, or reusable pattern you hit, each with Title, Tags, Context, Insight, Application. Skip routine work and anything obvious from the code. Write "None" if there are none.
```

### 7. Collect Results

Create each learning from the subagents' `## Learnings` sections here, in the main tree, one at a time — sequential creation is what keeps `LRN-NNN` IDs unique and the index conflict-free:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task TSK-{{ID}} --body -
## Context
{{context}}
## Insight
{{insight}}
## Application
{{application}}
BODY
```

Then report:

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

- Agent fails: block the task via `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-block {{ID}} --reason "{{failure summary}}"`, continue others
- All fail: summarize errors, suggest reviewing task definitions
