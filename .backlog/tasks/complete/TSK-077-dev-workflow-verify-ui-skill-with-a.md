---
id: TSK-077
title: dev-workflow verify-ui skill with a measuring subagent
status: complete
priority: P2
tags: [dev-workflow, skill, ui]
created: 2026-11-06
source: idea/PLN-031
depends-on: []
started: 2026-11-07
completed: 2026-11-07
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

- [x] docs/verify-ui.md contract format documented in plugins/dev-workflow/references/verify-ui-contract.md and kept generic — evidence: references/verify-ui-contract.md 210 lines (2026-11-07)
- [x] agents/ui-auditor.md measures with chrome-devtools MCP tools and evaluate_script, checks console errors, has no Bash, never edits files and returns the delta table
- [x] MCP tool names in the agent tools field verified against plugin agent behaviour, including a server that is absent or named differently — evidence: sub-agents.md tools table, errors.md zero-tools rule, components.md ignored mcpServers field; claude mcp list shows chrome-devtools (2026-11-07)
- [x] skills/verify-ui/SKILL.md takes scope from the argument or git diff, starts or probes the dev server, delegates to the agent, relays the table as-is and surfaces skipped checks
- [x] Missing docs/verify-ui.md or missing chrome-devtools MCP stops with an actionable message, never a clean report
- [x] Routing cases added to evals/routing.json including a Not for run case, and README command table updated — evidence: routing.json 3 positive + 3 negative incl. external run owner; README rows (2026-11-07)
- [x] pnpm lint:skills and claude plugin validate . pass and the version is set with pnpm bump — evidence: dev-workflow released as v1.11.0 (tag pushed) (2026-11-07)

## Notes

## Learnings

- LRN-057: Agent tools entries for an absent MCP server are dropped silently when any other tool resolves
- LRN-058: Routing eval negative cases with a built-in owner need external: true and prompts free of description tokens
## Progress Log

- [2026-11-06] Created
- [2026-11-07] Started
- [2026-11-07] Merged 58aad2e into main (root README conflict on the tree comment resolved: 22 flowstate skills, 12 dev-workflow skills). lint:skills 0/0, routing-eval dev-workflow 1.000, plugin validate passed. Bump pending the coordinated release.
- [2026-11-07] Completed