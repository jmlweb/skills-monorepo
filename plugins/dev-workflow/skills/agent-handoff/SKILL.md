---
name: agent-handoff
argument-hint: [out|in]
description: Standardize multi-repo work run by parallel agents — writes one self-contained handoff prompt per target repo (out) and reconciles the reports that come back against the original handoff (in). Use when the user says "handoff prompt", "hand this off to another agent", "write prompts for each repo", "reconcile the agent report", "what did the agent actually do", or "/agent-handoff". Stateless and read-only, so it works after /clear. Not for parallel tasks inside one repo (use flowstate:parallel) or for explaining failing CI (use ci-triage).
allowed-tools: Read, Grep, Glob
model: sonnet
effort: medium
---

# Agent Handoff

Write handoff prompts for agents working in other repos, then reconcile what they report back.

## Arguments

`$ARGUMENTS` (optional):

- `/agent-handoff out` — produce one prompt per target repo from the current context
- `/agent-handoff in` — compare a pasted handoff with a pasted agent report
- no argument — ask which mode: "Are you sending work out, or reconciling a report?"

## Prerequisites

- `out`: the target repos and what each must achieve are known from context. If a repo or goal is unclear, ask one question before writing.
- `in`: the user pasted both the original handoff and the agent report. Missing one → ask for it and stop.

This skill writes nothing: no tracker updates, no files. Output stays in chat for the user to copy.

## Workflow: `out`

### 1. Gather context

List target repos and, per repo, the goal. Collect links (ticket, PR, thread), constraints, and decisions already made. Use Read/Grep/Glob in the current repo only to confirm facts the prompts will cite.

### 2. Write one prompt per repo

Each prompt must stand alone: the receiving agent has none of this conversation. Use exactly these sections:

```
## Goal
<one or two sentences, outcome not steps>

## Links
- <ticket / PR / thread URLs>

## Constraints
- <what must not change, tooling rules, scope limits>

## Decisions already made
- <choice> — <why>; do not reopen

## Done when
- [ ] <checkable criterion>

## Branch
<see rule below>

## Report back
End with this block, max 10 lines:
STATUS: done | partial | blocked
DONE: <criteria met, each with evidence: commit/PR/test>
OPEN: <criteria not met and why>
CHANGED OUTSIDE SCOPE: <anything beyond the goal, or "none">
DECISIONS NEEDED: <questions for the coordinator, or "none">
```

**Branch rule.** Name a branch, never a worktree or path. If the user gave one, use it. Otherwise suggest `<type>/<ticket-or-slug>` (for example `feat/PROJ-123-export-csv`) and tell the agent to branch from the repo's default branch, or to reuse its current branch when it is already on a feature branch. Let the agent pick its own worktree location.

### 3. Safety check before printing

- No secrets: tokens, passwords, API keys, `.env` values. Refer to them by name ("use the `NPM_TOKEN` secret").
- No machine-local absolute paths (`/Users/...`, `C:\...`). Use repo-relative paths and URLs.
- Each prompt names its repo by slug (`org/repo`), not a local directory.

### 4. Print

One fenced block per repo, titled with the repo slug. Add a one-line reminder: paste the reports back with `/agent-handoff in`.

## Workflow: `in`

### 1. Parse both inputs

Extract the handoff's "Done when" criteria and constraints, and the report's claims. More than one repo → handle each handoff/report pair separately, then summarize.

### 2. Compare

Classify every criterion and every notable claim:

- **Done** — the report claims it with evidence (commit, PR, test result).
- **Open** — not mentioned, partial, or claimed without evidence.
- **Contradicted** — the report conflicts with the handoff (violates a constraint, reopens a decision, changes scope) or with another report.

Also flag: work outside scope, unanswered `DECISIONS NEEDED`, and a malformed or missing report block.

### 3. Limits

This mode compares text claims only. It cannot verify state in other repos (commits, CI, files). Say so in the output, and for each "Done" item name how the user can confirm it (for example `gh pr view`, the test command).

### 4. Report

```
Handoff reconciliation: <repo or "all repos">

Done:          <criterion — evidence claimed>
Open:          <criterion — what is missing>
Contradicted:  <criterion/claim — conflict>
Decisions needed: <list or none>

Verify yourself: <short list>
```

### 5. Next handoffs

Work remains (any open, contradicted, or decision item) → print follow-up prompts in the `out` format. Include only the remaining criteria, carry over the decisions made so far, and add the answers to any resolved questions. Nothing remains → say "All criteria claimed done" and stop.

## Errors

- **Report has no recognizable structure** → reconcile from free text, mark confidence low
- **Handoff lacks "Done when"** → derive criteria from its Goal and say you did
