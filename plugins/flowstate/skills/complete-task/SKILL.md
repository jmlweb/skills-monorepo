---
name: complete-task
description: Mark a task as completed and move it to done. Use when the user finishes work, says "done with task", "complete task", "mark as done", or when all acceptance criteria are met.
argument-hint: [task ID or number]
allowed-tools: [Read, Write, Bash, Glob, Grep]
model: haiku
---

# Complete Task

Mark a task as completed, move it to the complete directory, and handle learnings.

## Arguments

Task identifier (optional): $ARGUMENTS — accepts `TSK-001`, `001`, or `1`.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists.

## Workflow

### 1. Identify Task

If `$ARGUMENTS` provided, find matching file in `{{BACKLOG}}/tasks/active/`. If not there, check `{{BACKLOG}}/tasks/pending/` (a task can be completed without having been started) — if found there, confirm with the user before proceeding. If found nowhere, say so and stop.

If no argument, list active tasks and ask which to complete.

### 2. Verify Acceptance Criteria

Read the task file and check acceptance criteria. A tick is a claim; the proof is the `— evidence: <check> → <result> (<date>)` suffix on the criterion line.

1. List every ticked criterion with its evidence.
2. Re-run each command-type evidence fresh (tests, typecheck, build, lint) and show the result. Never trust the recorded result.
3. Flag criteria that are unticked, have no evidence, or whose re-run now fails.

| Claim | Required evidence |
|-------|-------------------|
| Tests pass | Test command output, exit 0 |
| Built / compiles | Build or typecheck command, exit 0 |
| Docs updated | File and section named |
| Behavior works | Command run + observed output, or `manual: <what was checked>` |

If nothing is flagged, proceed. Otherwise warn the user:

```
TSK-{{ID}} has unproven acceptance criteria:
- [ ] Criterion 3 — not ticked
- [x] Criterion 1 — no evidence
- [x] Criterion 2 — re-run failed: pnpm test → exit 1

Options:
1. Mark as complete anyway (criteria no longer relevant, or nothing to run)
2. Continue working (abort completion)
3. Update criteria (remove/modify items)

Already done but not ticked? Run /flowstate:log-progress {{ID}} to tick them with evidence.
```

On option 1, ask for a one-line reason and log it before moving:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update {{ID}} --log "Completed with unproven criteria {{N,...}}: {{REASON}}"
```

### 3. Extract Learnings

Gather learning candidates from two sources, then create each one silently using auto-draft mode (see `/flowstate:add-learning` Step 2a). Do NOT ask the user first.

**3a. From the task file's Learnings section** — each entry becomes a full learning (expand the one-line entry into Context / Insight / Application using the task body and tags).

**3b. From the recent conversation** — scan for non-obvious discoveries that emerged while working on this task: gotchas, root causes ("ah, that failed because…"), patterns that worked, things to avoid. High signal only — skip routine work.

For every candidate from 3a or 3b, run:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-create --title "{{TITLE}}" --tags "{{TAGS}}" --task {{TSK_ID}} --body -
{{BODY_DRAFTED_FROM_CONTEXT}}
BODY
```

Surface every captured learning in the confirm output (Step 5) so the user can edit or delete if signal was wrong. If no candidates from either source, skip silently — do NOT prompt.

### 4. Complete Task via CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move {{ID}} --to complete
```

The CLI updates frontmatter (`status: complete`, `completed: today`), adds a progress log entry, moves the file to `tasks/complete/`, and updates `tasks/index.md` automatically. It prints a `warning: ticked criteria without evidence: …` line (or `unverifiedCriteria` with `--json true`) for ticked criteria lacking evidence; relay it in Step 5. Exit code stays 0.

### 5. Confirm Completion

```
Completed TSK-{{ID}}: {{TITLE}}
{{PENDING_COUNT}} tasks remaining.

Learnings auto-captured: {{N}}
- LRN-XXX: {{TITLE}}            ← list each, so the user can edit/delete

/flowstate:next-task — Get a recommendation · /flowstate:add-learning — Capture another
```

If `N == 0`, omit the "Learnings auto-captured" block entirely.
