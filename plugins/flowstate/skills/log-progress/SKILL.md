---
name: log-progress
description: Record session progress on a task — dated Progress Log entries plus ticking acceptance criteria that are now met — through the CLI, never by hand-editing the task file. Use when the user says "log progress", "update the task", "tick criterion 2", "mark criteria done", "save where I am", or before /clear on unfinished work. Not for finishing a task (use complete-task) or blocking it (use block-task).
argument-hint: [task ID] [note]
allowed-tools: [Read, Bash(node:*)]
model: haiku
---

# Log Progress

Append what happened this session to a task's Progress Log and tick the acceptance criteria it met, so the task file is a reliable "where was I" record after `/clear`.

## Arguments

$ARGUMENTS — Optional. First word is the task ID (`TSK-001`, `001`, or `1`); the rest is a note to log as-is.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). Verify `{{BACKLOG}}` exists. If not, suggest `/flowstate:setup` and stop.

## Workflow

### 1. Resolve the Task

- ID in `$ARGUMENTS` → use it.
- Otherwise list active tasks:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true
```

Exactly one → use it. None or several → ask which task.

### 2. Re-read the Task File

Read the task file right before drafting, even if it was read earlier in the session. Criteria are ticked by position, so the numbering must reflect the file as it is now. Number the `## Acceptance Criteria` checkboxes 1, 2, 3… in order, counting ticked ones too.

### 3. Draft the Update

- **Log lines:** the note from `$ARGUMENTS` if given; otherwise draft 1–3 short lines from this session — what changed, then what's next. Facts only, no filler.
- **Criteria:** propose ticking only unticked criteria the session clearly satisfied (code written, tests green, docs updated). When in doubt, leave it unticked.
- **Evidence:** for every criterion you propose to tick, name the proof: a command run this session plus its result (`pnpm test → exit 0`), or `manual: <what was checked>`. A criterion with no evidence available stays unticked.

### 4. Confirm

Show the draft and wait for the user:

```
TSK-{{ID}} — {{TITLE}}

Log:
- {{LINE_1}}
- {{LINE_2}}

Tick:
- [x] 2. {{CRITERION_2}}
      evidence: {{COMMAND_OR_CHECK}} → {{RESULT}}

Apply? (yes / edit / cancel)
```

On edit, apply the user's changes and show the draft again. On cancel, stop without writing.

### 5. Apply via CLI

Each non-empty stdin line becomes its own dated bullet. Drop `--check` and `--evidence` when nothing is ticked. `--evidence` is a JSON object keyed by criterion number; every key must also be in `--check`.

```bash
cat <<'LOG' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update {{ID}} --log - --check {{N1,N2}} --evidence '{"{{N1}}":"{{COMMAND}} → {{RESULT}}"}'
{{LINE_1}}
{{LINE_2}}
LOG
```

An out-of-range index or a missing section aborts with nothing written. Re-read the file and retry with corrected numbers.

### 6. Offer a Learning

If the session surfaced something non-obvious (a gotcha, a root cause), offer `/flowstate:add-learning`. Never create the learning yourself.

### 7. Confirm

```
Logged on TSK-{{ID}}: {{N}} entr(y/ies), ticked {{K}} criteri(on/a).
Remaining criteria: {{UNTICKED_COUNT}}
```

If every criterion is now ticked, suggest `/flowstate:complete-task {{ID}}`.
