---
name: kickstart
description: Turns a project description into an honest evaluation, architecture decisions, starter docs and rules, an independent review, and first backlog tasks.
disable-model-invocation: true
argument-hint: [project description]
allowed-tools: [Read, Write, Edit, Glob, Grep, WebSearch, Agent, "Bash(node:*)", "Bash(ln:*)"]
model: sonnet
effort: high
---

# Kickstart

## Arguments

Project description (optional): $ARGUMENTS

## Prerequisites

Run in the target project's root. Resolve the backlog: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path --json true`. Call its `path` `{{BACKLOG}}` when `source` is `env` or `path` is `<cwd>/.backlog`. Any other result, including an error, means this project has no backlog yet; a `walk-up` path outside the cwd belongs to a parent project, so name it to the user. Then say that kickstart will create a public `.backlog/` here, committed with the project, and that a private backlog needs `/flowstate:setup` with the private option plus a session restart before running kickstart. Create it once the user agrees:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}" --json true
```

`{{BACKLOG}}` is the `root` it prints. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

Read `${CLAUDE_PLUGIN_ROOT}/shared/kickstart-templates.md` before step 1: every question, verdict, file and task this skill produces follows it.

**Write guard.** Before writing a project file, Glob for it. A missing file is created with Write. An existing file is Read, the proposed change is shown as a diff, and only the hunks the user approves are applied with Edit.

**Checkpoint.** A pause where the user answers approve, a list of changes, or stop. Changes are applied and the checkpoint is shown again. Stop goes straight to step 6, which reports what exists so far.

Done when: `{{BACKLOG}}` resolves inside this project and the templates file has been read.

## Workflow

### 1. Grill

Read `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md` and run its rounds, starting from `$ARGUMENTS`. The frontier covers:

- **Goal**: money, community, portfolio or learning
- **Users**: who uses it, in which situation
- **Scope**: what is in and what is explicitly out
- **Constraints**: platform, budget, time, compatibility, integrations
- **Product**: problem and its evidence, current workaround, why now, success metric, riskiest assumption (the templates' product frontier)

Look up existing project files (README, manifests) before asking about them.

Done when: the grilling done condition holds and goal, users, scope, constraints, problem, workaround, success metric and riskiest assumption are each known.

### 2. Evaluate

Apply the evaluation rubric from the templates file. Use WebSearch for the need evidence and the market scan, and for the riskiest-assumption validation when a search can run it. Write `docs/evaluation.md` (write guard applies), then show both verdicts, the gap, the viability answer and the riskiest assumption with its validation result.

On `infeasible`, stop here and name the blocking constraint. Otherwise: **Checkpoint 1.**

Done when: `docs/evaluation.md` exists and either the feasibility verdict is `infeasible` with its blocking constraint named, or the user approved checkpoint 1.

### 3. Write the project files

Write, following the templates (write guard applies):

1. `docs/adr/NNNN-<slug>.md`: one ADR per founding decision (typically 3–6), each naming a mechanism class, status `proposed`.
2. `AGENTS.md`: map, commands, testable rules that cite their ADR.
3. `CLAUDE.md`: run `ln -s AGENTS.md CLAUDE.md`. When `ln` reports `File exists`, a `CLAUDE.md` is already there: the write guard applies, proposing an `@AGENTS.md` line. On any other `ln` failure, Write a `CLAUDE.md` holding the single line `@AGENTS.md`.
4. `docs/overview.md`, including problem, success metric, riskiest assumption and kill criteria.

Then show the written file list, each ADR's Decision line, and the project skill proposals (procedures the project will repeat). **Checkpoint 2.** On approval, write each approved proposal to `.claude/skills/<name>/SKILL.md`.

Done when: the ADRs, `AGENTS.md`, `CLAUDE.md` and `docs/overview.md` exist on disk, every approved skill proposal is written, and the user approved checkpoint 2.

### 4. Review

Call the `Agent` tool with `subagent_type: "flowstate:kickstart-reviewer"`. Pass the goal statement (goal, users, scope, constraints, success metric, riskiest assumption) and the absolute paths of every file written in steps 2 and 3; nothing else from this conversation, so the review stays independent.

Show its findings with a recommendation for each (apply or reject, one reason). Apply the fixes the user accepts. When any fix touched an ADR, run the reviewer once more on the changed files and show its verdict; a third pass stays out of this run. **Checkpoint 3.** On approval, set each ADR's status to `accepted`. ADRs stay `proposed` when the user stops here.

Done when: the reviewer returned a verdict, accepted fixes are applied, and either the user approved checkpoint 3 and every ADR reads `accepted`, or the user stopped.

### 5. Seed tasks

Propose the tasks per the templates' seed-task rules: task 1 tests the riskiest assumption, the rest form a walking skeleton of user outcomes, 3–8 tasks. Each has priority, tags, 2–4 acceptance criteria and its `depends-on`. Propose in grilling rounds, one block per task, and close by confirming the kill criteria. Create the accepted tasks in dependency order, so each `depends-on` uses IDs already printed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P}} --tags "{{TAGS}}" --criteria '{{CRITERIA_JSON}}' --depends-on "{{IDS}}" --source "kickstart" --json true --body - <<'BODY'
{{TASK_BODY from the templates: Outcome, Validates, Implements}}
BODY
```

`{{CRITERIA_JSON}}` sits inside single quotes, so phrase every criterion without the `'` character. Omit `--depends-on` for tasks with none.

Done when: the CLI printed a TSK ID for every accepted task and the user confirmed the kill criteria.

### 6. Confirm

```
Kickstarted {{PROJECT}}
  Feasibility: {{VERDICT}} | Build: {{VERDICT}} | Goal: {{GOAL}}
  Riskiest assumption: {{ASSUMPTION}} — {{validated | tested by TSK-XXX}}
  Files:
    docs/evaluation.md
    docs/adr/0001-….md … {{N}} ADRs ({{accepted | proposed}})
    AGENTS.md, CLAUDE.md ({{symlink | pointer | merged}}), docs/overview.md
    {{.claude/skills/<name>/SKILL.md, if any}}
  Review: {{N}} findings, {{M}} applied
  Tasks: TSK-XXX → TSK-YYY → …
  Stopped at: {{step, if the user stopped or the verdict was infeasible}}

Next: /flowstate:start-task TSK-XXX
```

Done when: the confirmation block is printed with every file written and every task ID.
