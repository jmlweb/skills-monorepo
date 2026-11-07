---
id: TSK-077
title: dev-workflow verify-ui skill with a measuring subagent
status: pending
priority: P2
tags: []
created: 2026-11-06
source: idea/PLN-031
depends-on: []
---

# dev-workflow verify-ui skill with a measuring subagent

## Description

### Goal

Add a model-invoked `dev-workflow:verify-ui` skill and a `ui-auditor` agent. Together they check a UI change in a real browser and return a delta table with `FAIL`, `PENDING`, `KNOWN` and `PASS` rows.

### Approach

1. Define the per-repo contract in `docs/verify-ui.md`: base URL and how to start the app, surfaces, viewports, invariants with expected values, and `PENDING` and `KNOWN` lists. Keep it generic. Project specifics live only in this file.
2. Write `agents/ui-auditor.md`. It uses the `chrome-devtools` MCP tools, measures with `evaluate_script`, checks console errors, never edits files and returns the table.
3. Write `skills/verify-ui/SKILL.md`. Scope comes from the argument, or from `git diff` when none is given. The skill starts or probes the dev server, delegates to the agent, relays the table as-is and surfaces skipped checks. It never re-measures in the main thread and never fixes anything unless the user asks.
4. Handle missing prerequisites: no `docs/verify-ui.md` or no `chrome-devtools` MCP stops with an actionable message, never a clean report.
5. Add routing cases and update the README command table.
6. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

### Decisions

- The skill owns server start-up and probing. The agent only measures and stays read-only, with no Bash.
- The skill documents the `docs/verify-ui.md` format and does not scaffold it.
- The sandbox harness is a follow-up task. It covers a fixture page with one planted regression, one `PENDING` gap and a negative control run. Its open problem is running the `chrome-devtools` MCP non-interactively, since `sandbox-lib.mjs` harnesses are CLI-only so far.

## Acceptance Criteria

- [ ] docs/verify-ui.md contract format documented in plugins/dev-workflow/references/verify-ui-contract.md and kept generic
- [ ] agents/ui-auditor.md measures with chrome-devtools MCP tools and evaluate_script, checks console errors, has no Bash, never edits files and returns the delta table
- [ ] MCP tool names in the agent tools field verified against plugin agent behaviour, including a server that is absent or named differently
- [ ] skills/verify-ui/SKILL.md takes scope from the argument or git diff, starts or probes the dev server, delegates to the agent, relays the table as-is and surfaces skipped checks
- [ ] Missing docs/verify-ui.md or missing chrome-devtools MCP stops with an actionable message, never a clean report
- [ ] Routing cases added to evals/routing.json including a Not for run case, and README command table updated
- [ ] pnpm lint:skills and claude plugin validate . pass and the version is set with pnpm bump

## Notes

## Learnings

## Progress Log

- [2026-11-06] Created