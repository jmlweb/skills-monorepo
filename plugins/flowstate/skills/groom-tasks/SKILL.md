---
name: groom-tasks
description: Reviews open tasks against the code and applies the priority, spec and obsolescence changes the user approves.
disable-model-invocation: true
argument-hint: [--tag <tag>] [--priority <P1-P4>]
allowed-tools: [Read, Grep, Glob, "Bash(node:*)"]
model: sonnet
effort: medium
---

# Groom Tasks

## Arguments

Filters (optional): $ARGUMENTS — `--tag <tag>` keeps tasks carrying that tag, `--priority <P1-P4>` keeps tasks at that priority; both may combine. `task-list` accepts only `--status` and `--limit`, so apply these filters to its JSON output in step 1.

## Prerequisites

Resolve the backlog directory: run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path` and call its output `{{BACKLOG}}` (it errors when no backlog exists). If it errors, tell the user to run `/flowstate:setup` first. Write every CLI call as the full `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" ...` command; never put `node <path>` in a shell variable (zsh does not word-split it).

## Workflow

### 1. Load Open Tasks

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status pending --json true
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-list --status active --json true
```

The call that returned a task names its bucket (`pending` = not started, `active` = started). A `blocked` status can sit in either bucket, so the bucket, never the `status` field, says whether a task was started. Task state (status, priority, tags, bucket) comes from this output only; the file at `path` is read in step 2 for criteria and referenced files.

Apply the `$ARGUMENTS` filters to the union. When the set is empty, say so and stop. When it exceeds 12 tasks, warn and ask the user to narrow with `--tag` or `--priority`, or to confirm the full run.

Done when: the set to groom is fixed (confirmed by the user when it exceeds 12).

### 2. Assess Each Task Against the Code

Read each task body at its `path` for the description, acceptance criteria and referenced files. With Grep, Glob and Read, check:

- **Obsolete**: the behaviour the criteria describe already exists in the code, or the files and feature they target are gone.
- **Spec**: a criterion names a file, symbol or behaviour that was renamed or changed, so the criterion no longer matches the code.
- **Priority**: every `depends-on` task is complete, other open tasks depend on this one, the area is under active change, or the task is superseded. Proposed values stay within `P1`–`P4`.
- **Keep**: nothing above applies.

Evidence is a file path, a symbol, or a commit; a task title or description alone proves nothing.

Done when: every task in the set has one class (`obsolete`, `spec`, `priority`, `keep`) and a one-line evidence string naming a file, symbol or commit.

### 3. Present Proposals

List only the rows with a change; count the `keep` rows. Letter the rows so the menu survives rendering:

```
## Groom proposals ({{N}} changes across {{TOTAL}} open tasks)

| Row | Task | Bucket | Now | Proposed | Evidence |
|-----|------|--------|-----|----------|----------|
| A | TSK-012 | pending | P3 | P2 | unblocks TSK-020 and TSK-021, both P2 |
| B | TSK-015 | active | P2 | spec: criterion 2 names src/old.ts, now src/new.ts | src/new.ts |
| C | TSK-018 | pending | P4 | obsolete: shipped in 0ba7002 | src/core/id.ts:12 |

{{K}} tasks unchanged.

**Recommendation:** apply {{ROWS}}.
Reply `yes` to apply the recommendation, letters for another subset (`A C`), `all`, or `none` to stop.
```

Done when: the user has answered with `yes`, a set of letters, `all`, or `none`.

### 4. Apply Approved Rows

Run only the approved rows, in table order. Every change leaves a dated Progress Log reason through `--log`. The heredoc is quoted, so the reason text needs no escaping.

**Priority row**: `--set` does not validate values, so `{{P}}` is one of `P1`, `P2`, `P3`, `P4`.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update TSK-{{ID}} --set priority={{P}} --log - <<'BODY'
Groomed: priority {{OLD}} → {{P}}. {{EVIDENCE}}
BODY
```

**Spec row**: advisory only, since the CLI has no write path for task bodies or criteria. Log the proposed change so the next session applies it when starting the task:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update TSK-{{ID}} --log - <<'BODY'
Groomed: spec note. {{PROPOSED_CHANGE}}. {{EVIDENCE}}
BODY
```

**Obsolete row**: the task closes through `task-move` to complete; nothing is deleted, and an unapproved row stays where it is. Log the reason first, since `task-move` records only a plain "Completed" entry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-update TSK-{{ID}} --log - <<'BODY'
Groomed: closed as obsolete. {{EVIDENCE}}
BODY
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-move TSK-{{ID}} --to complete --json true
```

A task without a `## Progress Log` section makes `--log` exit with `SectionNotFoundError`. Record that row as failed with the error line and continue with the next row; for an obsolete row, a failed log also skips the move.

Done when: every approved row is recorded as applied or failed, and the run reached the last approved row.

### 5. Rebuild the Index

After at least one applied row:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild --type tasks
```

Done when: `index-rebuild` exits 0, or no row was applied.

### 6. Confirm

```
## Groom result

| Row | Task | Change | Result |
|-----|------|--------|--------|
| A | TSK-012 | P3 → P2 | applied |
| B | TSK-015 | spec note | failed: SectionNotFoundError (no Progress Log) |
| C | TSK-018 | closed as obsolete | applied |

{{APPLIED}} applied, {{FAILED}} failed, {{SKIPPED}} not approved, {{K}} unchanged. Index rebuilt: {{yes | not needed}}.
```

Done when: the result block lists every proposed row with one of `applied`, `failed: <error>` or `not approved`.
