---
name: harden
argument-hint: [targets | recent]
description: Audits named code for the bug classes this repo has really shipped and proves each bug with a failing test before fixing it.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
effort: high
---

# Harden

Attack named code on purpose, using the bugs this repo has already shipped as the guide. An **attack test** is a test written to expose a suspected bug. A bug counts as proven only when its attack test fails on the unfixed code.

## Arguments

`$ARGUMENTS`:

- Files, modules or symbols → audit those.
- `recent` → what changed since the last release marker (latest tag, else latest release commit).
- Empty → propose at most 10 targets, ranked by how many past fixes touched them, and wait for the user to pick.

## Prerequisites

Run `git status --porcelain`. The tree must be clean, so every change in the run belongs to this audit. Dirty tree → stop and ask the user to commit or stash.

Done when: `git status --porcelain` prints nothing.

## Workflow

### 1. Discover the commands

Find the test command, then every other gate (lint, typecheck, build):

1. JS or TS repo: `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-test-runner --cwd <dir> --json true`. A `runner` of `unknown` falls through to the next source.
2. CI workflows, then `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, then manifest scripts and the `Makefile`.
3. Nothing found → ask the user for the test command. Without one, this skill stops: an unproven bug is a guess.

Run the suite once. Failures already there are named as baseline and left alone.

Done when: the test command is known and the suite's baseline result is recorded.

### 2. Derive the bug classes

Gather evidence in this order. Use every source that exists and record which ones did:

1. A failure-mode table in the repo. Format: `${CLAUDE_PLUGIN_ROOT}/references/failure-modes.md`.
2. Bug reports in `.backlog/reports/`, when that directory exists.
3. Fix history: `git log -i -E --grep='^fix|bug|regression|leak|crash|race' --format='%h %s'`, plus `git log --format='%h %s' -- <target>` for each target. Read the diffs of commits whose subject is vague.

Group them into classes, each citing at least one commit or report. Then rank the classes by how often they recur. Fewer than 3 classes reachable from the targets → add classes from `${CLAUDE_PLUGIN_ROOT}/references/harden-attacks.md`, labelled `generic`.

Done when: every class is listed with its evidence or its `generic` label.

### 3. Model each target

Read the target, its tests and its callers. Note its input domain, its contract (from docs, types and tests) and the edge regions its tests already cover. Its contract is what an attack test may assert; behaviour nobody specified goes to the report as a question.

Done when: each target has a domain, a contract and a list of covered edges.

### 4. Attack

Mark each class against each target: `covered` (name the test), `safe` (say why) or `suspicious`. For each suspicious pair, write the attack test first, in the repo's test style and location, and run only that test.

- Fails → proven bug. Keep the failure output for the report, then go to step 5.
- Passes → behaviour holds. Keep the test when it covers a new edge, delete it when it repeats another.

Done when: each pair is marked and each suspicious pair has a test result.

### 5. Fix

Change the target as little as the attack test requires, then re-run it and confirm it passes.

A fix that needs a public signature, documented behaviour or the error contract to change is a breaking change: revert it, move the attack test out of the tree into the report, and record the target as `needs decision` with both options. The user decides.

An existing assertion in the way means the same thing: its old expectation is a contract. Leave it as written and escalate.

Done when: every proven bug is fixed with its attack test green, or recorded as `needs decision`.

### 6. Verify

Run the whole suite and every gate from step 1. A failure caused by this run gets fixed; a threshold, skip or suppression stays as the repo set it.

Done when: every gate matches or beats its baseline.

### 7. Report

One block per target:

```
<target>: clean | hardened | needs decision
  Class: <name> (<evidence: commit or report id, or generic>)
  Bug: <input> gives <wrong output>; proof: <one line of the failing run>
  Tests added: <count and classes>
  Escalated: <the decision and its options, or none>
```

Then:

- Gates: each command with its result.
- Failure-mode rows: one proposed row per confirmed bug, in the format of `${CLAUDE_PLUGIN_ROOT}/references/failure-modes.md`, traced to the old fix it repeats. The user decides where they go.
- Commits: one `fix:` per target with a real bug and one `test:` for the rest. Staging and committing wait for the user; suggest `/dev-workflow:commit`.

Done when: the blocks are printed and `git status --porcelain` shows only test files and the fixes reported.
