---
name: kickstart
description: Takes a project description to an evaluated, documented and tasked starting point, or to a reasoned decision not to build it.
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

Run in the target project's root. Resolve the backlog: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path --json true`. Call its `path` `{{BACKLOG}}` when `source` is `env` or `path` is `<cwd>/.backlog`. Any other result, including an error, means this project has no backlog yet; step 3 offers to create one. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

Read `${CLAUDE_PLUGIN_ROOT}/shared/kickstart-templates.md` before step 1: every question, verdict, recommendation, file and task this skill produces follows it.

**Write guard.** Before writing a project file, Glob for it. A missing file is created with Write. An existing file is Read, the proposed change is shown as a diff, and only the hunks the user approves are applied with Edit.

**Checkpoint.** A pause that opens with the recommendation from the templates' checkpoint recommendations; the user answers yes, a list of changes, or stop. Changes are applied and the checkpoint is shown again. Stop goes straight to step 6, which reports what exists so far.

Done when: `{{BACKLOG}}` is set or known to be absent for this project, and the templates file has been read.

## Workflow

### 1. Grill

Read `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md` and run its rounds, starting from `$ARGUMENTS`. The frontier covers:

- **Goal**: money, community, portfolio or learning
- **Users**: who uses it, in which situation
- **Scope**: what is in and what is explicitly out
- **Constraints**: platform, budget, time, compatibility, integrations
- **Product**: the templates' product frontier (problem and evidence, workaround, why now, success metric, riskiest assumption, proposed kill criteria)

Look up existing project files (README, manifests) before asking about them.

Done when: the grilling done condition holds and every frontier item above is answered or accepted, or the user stopped.

### 2. Evaluate

Apply the evaluation rubric from the templates file, including its refuted-assumption rule. Use WebSearch for the need evidence and the market scan, and for the riskiest-assumption validation when a search can run it. Write `docs/evaluation.md` (write guard applies), then show both verdicts, the gap, the viability answer and the riskiest assumption with its validation result.

On `infeasible`, stop here and name the blocking constraint. Otherwise run **Checkpoint 1** with the recommendation the Build verdict sets. On `don't build`, ask the proceed-anyway question too, and continue only on an explicit yes. On an approved `build with changes`, fold the named change into Scope before step 3. After a refuted assumption, the change (or the proceed-anyway answer) names the replacement assumption, which the docs carry as the riskiest assumption from here on.

Done when: `docs/evaluation.md` exists, and the verdict is `infeasible` with its blocking constraint named, or the user stopped, or the user chose to proceed (with the change in Scope for `build with changes`).

### 3. Write the project files

When `{{BACKLOG}}` is absent, offer first, recommending yes: kickstart creates a public `.backlog/` here, committed with the project; a `walk-up` path from the prerequisites belongs to a parent project, so name it; a private backlog needs `/flowstate:setup` with the private option plus a session restart. On yes:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}" --json true
```

Phrase `{{PROJECT_NAME}}` without `"`, `$` or backticks: it sits inside double quotes. `{{BACKLOG}}` is the `root` it prints. On no, the files below are still written and step 5 proposes no tasks.

Write, following the templates (write guard applies):

1. `docs/adr/NNNN-<slug>.md`: one ADR per founding decision (typically 3–6), each naming a mechanism class, status `proposed`.
2. `AGENTS.md`: map, commands, testable rules that cite their ADR.
3. `CLAUDE.md`: run `ln -s AGENTS.md CLAUDE.md`. When `ln` reports `File exists`, a `CLAUDE.md` is already there: the write guard applies, proposing an `@AGENTS.md` line. On any other `ln` failure, Write a `CLAUDE.md` holding the single line `@AGENTS.md`.
4. `docs/overview.md`, including problem, success metric, riskiest assumption and kill criteria.

Then show the written file list, each ADR's Decision line, and the project skill proposals (procedures the project will repeat). **Checkpoint 2.** On approval, write each approved proposal to `.claude/skills/<name>/SKILL.md`.

Done when: the backlog offer is answered, the ADRs, `AGENTS.md`, `CLAUDE.md` and `docs/overview.md` exist on disk, and either every approved skill proposal is written and the user approved checkpoint 2, or the user stopped.

### 4. Review

Call the `Agent` tool with `subagent_type: "flowstate:kickstart-reviewer"`. Pass the goal statement (goal, users, scope, constraints, success metric, riskiest assumption) and, as they are on disk after every write-guard merge, the absolute paths of `docs/evaluation.md`, the ADRs, `AGENTS.md`, `docs/overview.md` and any written project skill; nothing else from this conversation, so the review stays independent.

Show its findings with a recommendation for each (apply or reject, one reason). Apply the fixes the user accepts. When any fix touched an ADR, run the reviewer once more on the changed files and show its verdict; a third pass stays out of this run. **Checkpoint 3.** On approval, set each ADR's status to `accepted`. ADRs stay `proposed` when the user stops here. When an accepted fix changes the Build verdict, show checkpoint 1's recommendation for the new verdict before checkpoint 3; a stop there goes to step 6.

Done when: the reviewer returned a verdict, accepted fixes are applied, and either the user approved checkpoint 3 and every ADR reads `accepted`, or the user stopped.

### 5. Seed tasks

When the user declined the backlog in step 3, propose no tasks: confirm the kill criteria, then write them and `pending: not tested, no backlog` into both docs, per the templates' declined-backlog rule, and go to step 6.

Propose the tasks per the templates' seed-task rules: task 1 tests the riskiest assumption and every other task lists it in `depends-on`, unless the evaluation already validated the assumption, in which case there is no gate. Task 1 carries the strictly highest priority of the seeded tasks, because the gate is advisory. After a refuted assumption the user proceeded past, task 1 tests the replacement assumption, and both docs name the replacement (write guard applies). The rest form a walking skeleton of user outcomes, 3–8 tasks in total. Each has priority, tags, 2–4 acceptance criteria and its `depends-on`. Propose in grilling rounds, one block per task, and close by confirming the kill criteria. Create the accepted tasks in dependency order, so each `depends-on` uses IDs already printed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P}} --tags "{{TAGS}}" --criteria '{{CRITERIA_JSON}}' --depends-on "{{IDS}}" --source "kickstart" --json true --body - <<'BODY'
{{TASK_BODY from the templates: Outcome, Validates, Implements}}
BODY
```

Phrase `{{TITLE}}` and `{{TAGS}}` without `"`, `$` or backticks: they sit inside double quotes. `{{CRITERIA_JSON}}` is valid JSON inside single quotes, so phrase every criterion without `'`, `"` or `\`. Omit `--depends-on` for tasks with none. Then update `docs/evaluation.md` and `docs/overview.md` with the confirmed kill criteria and task 1's TSK ID (write guard applies).

Done when: the backlog was declined and both docs carry the confirmed kill criteria and `pending: not tested, no backlog`, or the user stopped, or the CLI printed a TSK ID for every accepted task, the user confirmed the kill criteria, and both docs carry them and task 1's ID.

### 6. Confirm

```
Kickstarted {{PROJECT}}
  Feasibility: {{VERDICT}} | Build: {{VERDICT}}{{, proceeded against the advice}} | Goal: {{GOAL}}
  Riskiest assumption: {{ASSUMPTION}} — {{held | refuted | tested by TSK-XXX | not tested, no backlog}}
  Kill criteria: {{CRITERIA}}
  Files:
    docs/evaluation.md
    docs/adr/0001-….md … {{N}} ADRs ({{accepted | proposed}})
    AGENTS.md, CLAUDE.md ({{symlink | pointer | merged}}), docs/overview.md
    {{.claude/skills/<name>/SKILL.md, if any}}
  Review: {{N}} findings, {{M}} applied
  Backlog: {{BACKLOG | "declined: no tasks seeded"}}
  Tasks: TSK-XXX → TSK-YYY → …
  Stopped at: {{infeasible at step 2 | checkpoint N | step N, user stopped}}

Next: /flowstate:start-task TSK-XXX
```

Drop the lines for things the run never reached.

Done when: the confirmation block is printed with every file written, every task ID, and the stop point when the run ended early.
