---
name: parallel
description: Runs independent backlog tasks at once in isolated worktrees via subagents. Use when the user says "run in parallel", "start these together", "work on TSK-001 and TSK-002 at once", or confirms a parallel group offered by next-task. Not for a single task (use start-task).
argument-hint: [task IDs separated by comma]
allowed-tools: [Read, "Bash(node:*)", "Bash(git:*)", Glob, Grep, Agent]
model: sonnet
effort: medium
---

# Parallel Tasks

## Arguments

$ARGUMENTS — comma-separated task IDs (e.g., `1,2,3` or `TSK-001,TSK-002`). Optional.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Identify Candidates

If `$ARGUMENTS` provided, parse comma-separated IDs and validate each exists in `tasks/pending/` or `tasks/active/` and is not blocked.

If no argument:
- List all pending non-blocked tasks
- Parse file references from each task
- Identify independent groups (no overlapping files)

Done when: a list of validated, non-blocked task IDs exists.

### 2. Detect File Overlaps (Informational)

Parse each task for file references. Note overlaps — with worktree isolation these won't conflict at runtime but may need manual merge afterward.

Done when: each candidate pair is marked overlapping or disjoint.

### 3. Present Selection

```
## Independent Tasks

| ID | Title | Priority | Files | Notes |
|----|-------|----------|-------|-------|

Recommended groups:
- Group A: TSK-001 + TSK-002 (no overlaps)

Which tasks? (comma-separated)
```

Skip the question when `$ARGUMENTS` already named the tasks.

Done when: the user has named the tasks to run, or `$ARGUMENTS` did.

### 4. Start All Selected Tasks

For each selected task, activate it via CLI:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to active
```

The CLI handles frontmatter updates, file moves, and index updates.

Then commit the moves when `{{BACKLOG}}` is inside the repo's tracked tree (it ends in `.backlog` and is not git-ignored). Worktrees branch from `HEAD`, so uncommitted moves leave subagents with stale `pending/` copies and cause merge conflicts later. A private backlog (outside the repo or git-ignored) is shared by every worktree and needs no commit; skip it. The pathspec keeps unrelated staged work out of this commit:

```bash
git add "{{BACKLOG}}" && git commit -m "chore(backlog): start {{IDS}}" -- "{{BACKLOG}}"
```

Done when: every selected task is in `tasks/active/` and the move commit exists when the backlog is tracked.

### 5. Load Context for Subagents

Run a single combined search using all unique tags and titles from the selected tasks:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --tags "{{ALL_UNIQUE_TAGS}}" --query "{{ALL_TITLES_CONCATENATED}}" --limit 5 --json true
```

Distribute results to subagents by tag overlap: include a learning in a subagent's prompt if its tags or reasons reference terms from that task's title or tags. A single learning may appear in multiple prompts if relevant. Results whose `source` is not `local` belong to another project: read them from their `backlog` path, never edit or archive them.

Also scan `{{BACKLOG}}/reports/pending/` once for any reports related to the selected tasks' scope.

Done when: each selected task has its list of learnings and reports (possibly empty).

### 6. Launch Subagents

Launch ALL subagents with the Agent tool in a **single message**, each with `isolation: "worktree"`. Under `## Worktree Rules`, paste the text of `${CLAUDE_PLUGIN_ROOT}/shared/worktree-brief.md` with `{{BASE}}` set to the current branch, then the project's own worktree brief when its rules files define one.

When several tasks each create sequentially numbered files (ADRs, migrations), reserve the numbers up front and state each subagent's number in its prompt, since otherwise they all pick the same next number.

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

## Worktree Rules                  ← always; see the launch step above

## Instructions
1. Follow the Worktree Rules, read project documentation (README, CLAUDE.md, etc.), then apply the learnings above — they capture past mistakes and proven patterns
2. Implement each acceptance criterion
3. Verify changes work (build, lint, test as applicable)
4. Leave the backlog directory and flowstate CLI to the coordinator, because other agents run in parallel
5. Create a commit referencing TSK-{{ID}}
6. End your final report with a `## Learnings` section: one entry per non-obvious root cause, undocumented behavior, gotcha, or reusable pattern you hit, each with Title, Tags, Context, Insight, Application. Skip routine work and anything obvious from the code. Write "None" if there are none.
```

Done when: every subagent has returned a report.

### 7. Collect Results

Create each learning from the subagents' `## Learnings` sections here, in the main tree, one at a time — sequential creation is what keeps `LRN-NNN` IDs unique and the index conflict-free:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task TSK-{{ID}} --body - <<'BODY'
## Context
{{context}}
## Insight
{{insight}}
## Application
{{application}}
BODY
```

Then report, ending when every selected task has a row and every `## Learnings` entry has an LRN ID or was skipped as None:

```
## Parallel Execution Complete

| Task | Result | Branch/Worktree |
|------|--------|-----------------|

Next: review each worktree, then /flowstate:complete-task (succeeded) or /flowstate:block-task (failed).
```

## Error Handling

- Agent fails: block the task via `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-block {{ID}} --reason "{{failure summary}}"`, continue others
- All fail: summarize errors, suggest reviewing task definitions
