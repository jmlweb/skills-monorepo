---
name: review-idea
description: Reviews pending ideas and approves, discards or revises each one.
disable-model-invocation: true
argument-hint: [idea ID]
allowed-tools: [Read, Edit, "Bash(node:*)", "Bash(git:*)", Glob, Grep]
model: sonnet
effort: medium
---

# Review Idea

## Arguments

Idea identifier (optional): $ARGUMENTS — accepts `PLN-001`, `001`, or `1`. With one, the run reviews that idea; without one, every pending idea in order.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). List the pending ideas with `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-list --status pending --json true`; each entry carries its `path`. If the list is empty, inform the user and stop. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Identify Ideas

With `$ARGUMENTS`: resolve that one idea in the `idea-list` output. The queue holds only that idea.

Without `$ARGUMENTS`: the queue holds every idea in the `idea-list` output, sorted by ID ascending (oldest first).

Done when: the queue holds one or more pending idea files, in run order.

### 2. Present Summary

Take the head of the queue. Read the full idea file and present:

```
## PLN-{{ID}}: {{TITLE}}
Complexity: {{COMPLEXITY}} | Created: {{DATE}}

### Goal
{{summary}}

### Approach ({{N}} steps)
1. ...

### Files to Modify
...

### Risks
...
```

Done when: the summary block is printed.

### 3. Audit the Idea

Before recommending, audit the idea against the actual codebase. Skip steps that don't apply.

- **Files exist & are accurate**: verify every path under "Files to Modify" exists. Check the relevant code matches what the idea assumes (function names, signatures, surrounding logic).
- **Approach soundness**: read each step critically. Are there missing steps (tests, migrations, types, docs)? Steps that won't compile or contradict existing patterns?
- **Risk gaps**: high/medium-complexity ideas with an empty or trivial Risks section are a red flag — propose at least one concrete risk grounded in the code.
- **Conflicts with active work**: scan `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true` and recent commits (`git log --oneline -20`) for overlapping changes that could collide.
- **Related learnings**: `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-search --query "{{TITLE}}" --limit 3 --json true` (phrase `{{TITLE}}` without `"`, `$` or backticks: it sits inside double quotes) for prior insights that should shape the approach. Results whose `source` is not `local` belong to another project: read them from their `backlog` path, never edit or archive them.

Surface only the conclusions, in the next step.

Done when: each applicable check has a conclusion.

### 4. Recommend

Emit a single recommendation **before** offering the menu, in this shape:

```
**Recommendation:** {approve | discard | revise}
**Why:** {1-2 lines tying the decision to evidence from step 3}
**Proposed priority:** {P1-P4} (from complexity {{COMPLEXITY}} → {{P}})
**Concerns:**
- {concrete issue grounded in the code, if any}
- {missing step or risk gap, if any}
```

If the recommendation is **revise**, list the specific changes you'd make so the user can accept them in one go.

Then list the override options:

- **A · Approve** — Convert this idea into a backlog task
- **B · Discard** — This idea is not needed
- **C · Revise** — The idea needs changes
- **D · Stop** — End the run now; this idea and the rest of the queue stay pending

Ask the user to confirm the recommendation or pick a different option. A plain "yes" accepts the recommendation.

Done when: the user has confirmed the recommendation, picked another option, or chosen stop.

### 5. Apply the Decision

Run the branch the user chose. Stop applies nothing and goes to step 7.

#### 5a. Approve

```bash
# Create task from idea (stdin carries the idea's Goal + Approach)
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P}} --source "idea/PLN-{{ID}}" --criteria '{{CRITERIA_JSON}}' --body - <<'BODY'
{{IDEA_GOAL_AND_APPROACH}}
BODY

# Move idea to complete (TSK-{{NEW_ID}} comes from the task-create output above)
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-move PLN-{{ID}} --status approved --task-id TSK-{{NEW_ID}}
```

Phrase `{{TITLE}}` without `"`, `$` or backticks: it sits inside double quotes. `{{CRITERIA_JSON}}` is valid JSON inside single quotes, so phrase every criterion without `'`, `"` or `\`. The CLI handles frontmatter updates, file moves, and index updates.

- Priority: derive automatically from complexity (low→P3, medium→P2, high→P2). Apply silently. Surface it in the confirm output so the user can override if needed.
- Acceptance criteria: derive from the Approach steps. Pass as a JSON array: `--criteria '["criterion 1","criterion 2"]'`

Confirm:
```
Idea PLN-{{ID}} approved → TSK-{{NEW_ID}}: {{TITLE}} ({{PRIORITY}})
/flowstate:start-task TSK-{{NEW_ID}} to begin
```

Done when: the CLI prints the new TSK ID and `idea-move` exits 0.

#### 5b. Discard

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" idea-move PLN-{{ID}} --status discarded
```

Done when: `idea-move` exits 0 and the discard is confirmed to the user.

#### 5c. Revise

1. Discuss needed changes with the user
2. Edit the idea body in place with the Edit tool (frontmatter untouched). The file stays in `ideas/pending/` and joins the run's skipped list, so later steps don't present it again
3. Append a revision note at the end of the file:
   ```markdown
   ## Revision History
   - [{{TODAY}}] {{what changed}}
   ```

Done when: the idea file holds the agreed changes and a dated revision note.

### 6. Next Idea

Drop from the queue every idea on the skipped list. If the queue still holds ideas, return to step 2 with the head of the queue. Otherwise go to step 7.

Done when: the queue is empty or stop was chosen.

### 7. Closing Summary

A single-idea run ends with the confirm output of step 5a, 5b or 5c. A multi-idea run ends with one line per idea, in run order (`PLN-XXX not reached` for ideas left after a stop), then the pending count:

```
PLN-002 → TSK-051 (P2)
PLN-003 discarded
2 still pending in ideas/pending/
```

Done when: the outcome of every idea in the queue is printed and the pending count matches the files left in `ideas/pending/`.
