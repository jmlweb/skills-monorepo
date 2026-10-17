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

Run in the target project's root. Resolve the backlog: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}`. When it errors, no backlog exists yet: say that kickstart will create a public `.backlog/` committed with the project, and that a private backlog needs `/flowstate:setup` with the private option plus a session restart before running kickstart. Create it once the user agrees:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" setup --project-name "{{PROJECT_NAME}}" --json true
```

`{{BACKLOG}}` is the `root` it prints. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

Read `${CLAUDE_PLUGIN_ROOT}/shared/kickstart-templates.md` before step 2: every file this skill writes follows it.

**Write guard.** Before writing any project file, Glob for it. When it exists, show a diff of the proposed change and write only the hunks the user approves. A checkpoint is a pause where the user answers approve or a list of changes; the run continues only on approve.

Done when: `{{BACKLOG}}` resolves and the templates file has been read.

## Workflow

### 1. Grill

Read `${CLAUDE_PLUGIN_ROOT}/shared/grilling.md` and run its rounds, starting from `$ARGUMENTS`. The frontier covers:

- **Goal**: money, community, portfolio or learning, and what success looks like
- **Users**: who uses it, in which situation
- **Scope**: what is in and what is explicitly out
- **Constraints**: platform, budget, time, compatibility, integrations

Look up existing project files (README, manifests) before asking about them.

Done when: the grilling done condition holds and goal, users, scope and constraints are each known.

### 2. Evaluate

Apply the evaluation rubric from the templates file:

1. Feasibility verdict against the constraints.
2. Market scan with WebSearch: established tools that cover the same need, each with its source link. When WebSearch is unavailable, mark the section unverified and list only alternatives the user named.
3. Gap: the differentiator, or a plain "no gap" naming the tool that covers it.
4. Goal: fixed to one type; state whether it justifies building given the gap.

Write `docs/evaluation.md` (write guard applies), then show the verdict and gap. On `infeasible`, stop after the file is written and name the blocking constraint. **Checkpoint 1.**

Done when: `docs/evaluation.md` exists and the user approved checkpoint 1.

### 3. Draft the project files

Draft, following the templates:

1. `docs/adr/NNNN-<slug>.md`: one ADR per founding decision (typically 3–6), each naming a mechanism class, status `proposed`.
2. `AGENTS.md`: map, commands, testable rules that cite their ADR.
3. `CLAUDE.md`: when it does not exist, run `ln -s AGENTS.md CLAUDE.md`. When `ln` fails, Write a `CLAUDE.md` holding the single line `@AGENTS.md`. When `CLAUDE.md` already exists, the write guard applies: propose adding `@AGENTS.md` to it.
4. `docs/overview.md`.
5. Project skill proposals for procedures the project will repeat: shown, not written.

Show the file list and each ADR's Decision line. **Checkpoint 2.** On approval, write each approved skill proposal to `.claude/skills/<name>/SKILL.md`.

Done when: every drafted file exists on disk and the user approved checkpoint 2.

### 4. Review

Spawn the `Agent` tool with `subagent_type: "flowstate:kickstart-reviewer"`. Pass the goal statement (goal, users, scope, constraints) and the absolute paths of every file from steps 2 and 3; nothing from this conversation beyond that, so the review stays independent.

Show its findings with a recommendation for each (apply or reject, one reason). Apply the fixes the user accepts. When any fix touched an ADR, run the reviewer once more on the changed files and show its verdict; a third pass stays out of this run. **Checkpoint 3.** On approval, set each ADR's status to `accepted`.

Done when: the reviewer returned a verdict, accepted fixes are applied, ADRs read `accepted`, and the user approved checkpoint 3.

### 5. Seed tasks

Propose a walking skeleton: the thinnest end-to-end slice first, then the tasks that thicken it, 3–8 tasks, each with priority, tags, 2–4 acceptance criteria and its `depends-on`. Propose in grilling rounds, one block per task. Create the accepted tasks in dependency order, so each `depends-on` uses IDs already printed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P}} --tags "{{TAGS}}" --criteria '{{CRITERIA_JSON}}' --depends-on "{{IDS}}" --source "kickstart" --json true --body - <<'BODY'
{{DESCRIPTION citing the ADRs it implements}}
BODY
```

Omit `--depends-on` for tasks with none.

Done when: the CLI printed a TSK ID for every accepted task.

### 6. Confirm

```
Kickstarted {{PROJECT}}
  Verdict: {{VERDICT}} | Goal: {{GOAL}}
  Files:
    docs/evaluation.md
    docs/adr/0001-….md … {{N}} ADRs
    AGENTS.md, CLAUDE.md ({{symlink | pointer | merged}}), docs/overview.md
    {{.claude/skills/<name>/SKILL.md, if any}}
  Review: {{N}} findings, {{M}} applied
  Tasks: TSK-XXX → TSK-YYY → …

Next: /flowstate:start-task TSK-XXX
```

Done when: the confirmation block is printed with every file written and every task ID.
