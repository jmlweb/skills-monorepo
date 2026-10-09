---
name: guide
description: Maps flowstate's commands into flows so you know which one to run next.
disable-model-invocation: true
argument-hint: [situation]
allowed-tools: Read
model: haiku
---

# Guide

Route the user to the right flowstate command for their situation.

## Arguments

Situation (optional): $ARGUMENTS

## Workflow

### 1. Pick the flow

With `$ARGUMENTS` empty, print the whole map below. Otherwise print only the flow that fits the situation, then the exact command to run next.

Done when: the output names a concrete `/flowstate:<command>` as the next step.

### 2. Verify before describing

Summaries below are orientation. Before stating what a command does, accepts or produces, Read `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md`.

Done when: every behaviour claim in the reply comes from a SKILL.md read in this run.

## The map

**Precondition.** `setup` creates `.backlog/`; every other flow needs it.

**Main flow.** Work that needs design first:
`idea` → `review-idea` (approving creates the task) → `start-task` → `log-progress` (as many times as needed) → `complete-task`

**Direct entry.** Work already scoped: `add-task` skips the idea step, then continue at `start-task`.

**Pick what's next.** `next-task` recommends; `parallel` runs independent tasks side by side in worktrees.

**Stuck.** `block-task` records the blocker. `check-task` confirms a task's status matches the code.

**Problems found along the way.** `report` files a bug or finding → `triage-report` turns it into a task or discards it.

**Knowledge.** `add-learning` records an insight, `learnings` searches them, `retro` mines a session's mistakes into durable fixes.

**Maintenance.** `overview` shows backlog health; `condense-tasks` and `condense-learnings` shrink the archives.

## Confirmation

```
Flow: {{FLOW}}
Next: /flowstate:{{COMMAND}}
```
