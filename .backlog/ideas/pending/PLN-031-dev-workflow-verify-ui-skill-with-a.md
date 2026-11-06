---
id: PLN-031
title: dev-workflow verify-ui skill with a measuring subagent
status: pending
created: 2026-11-06
complexity: high
---

## Goal

Add a model-invoked `dev-workflow:verify-ui` skill and a `ui-auditor` agent. Together they check a UI change in a real browser and return a delta table with `FAIL`, `PENDING`, `KNOWN` and `PASS` rows.

## Context

Two projects built this separately: `secuela` (`verify-design` + `artboard-auditor`) and `subbuteo` (`verify`). No skill in this repo covers it. The built-in `run` skill launches an app, but it does not audit against expected values.

Three lessons carry over from the sources:

- Screenshots and per-breakpoint sweeps are the token cost of this job, so they belong in a subagent.
- Expected gaps need their own rows. Without `PENDING` and `KNOWN`, the report is noise that hides the one real regression (`artboard-auditor`).
- A narrowed audit that reads as clean is worse than none, so skipped checks must be reported (`verify-design`).

From `subbuteo` `css-fix`: measure what the browser computed before reading or editing CSS. Eyeballing caused repeated multi-round fixes there.

Cross-project LRN-019 (svgworm): browser render checks need a negative control.

## Approach

1. Define the per-repo contract in `docs/verify-ui.md`: base URL and how to start the app, surfaces, viewports, invariants with expected values, and `PENDING` and `KNOWN` lists. Keep it generic. Project specifics live only in this file.
2. Write `agents/ui-auditor.md`. It uses the `chrome-devtools` MCP tools, measures with `evaluate_script`, checks console errors, never edits files and returns the table.
3. Write `skills/verify-ui/SKILL.md`. Scope comes from the argument, or from `git diff` when none is given. The skill starts or probes the dev server, delegates to the agent, relays the table as-is and surfaces skipped checks. It never re-measures in the main thread and never fixes anything unless the user asks.
4. Handle missing prerequisites: no `docs/verify-ui.md` or no `chrome-devtools` MCP stops with an actionable message, never a clean report.
5. Add routing cases and update the README command table.
6. Run `pnpm lint:skills` and `claude plugin validate .`, then set the version with `pnpm bump`.

## Decisions

- The skill owns server start-up and probing. The agent only measures and stays read-only, with no Bash.
- The skill documents the `docs/verify-ui.md` format and does not scaffold it.
- The sandbox harness is a follow-up task, filed when this idea is approved. It covers a fixture page with one planted regression, one `PENDING` gap and a negative control run. Its open problem is running the `chrome-devtools` MCP non-interactively, since `sandbox-lib.mjs` harnesses are CLI-only so far.

## Files to Modify

- `plugins/dev-workflow/skills/verify-ui/SKILL.md` — new skill
- `plugins/dev-workflow/agents/ui-auditor.md` — new read-only measuring agent
- `plugins/dev-workflow/references/verify-ui-contract.md` — format of the per-repo `docs/verify-ui.md`
- `plugins/dev-workflow/evals/routing.json` — routing cases
- `plugins/dev-workflow/README.md` — command table row

## Risks & Considerations

- Agent `tools` must name MCP tools, so the agent depends on a user-configured server name. Confirm the behaviour when the server is absent or named differently, and check `tools` syntax against `plugins/flowstate/references/plugin-docs.md`.
- Trigger overlap with built-in `run`. The description needs a "Not for" clause.
- The skill ships without a live harness until the follow-up lands, so its first real run is the first end-to-end check.

## Revision History

- [2026-11-07] Moved server start-up to the skill, resolved scaffolding as document-only, split the sandbox harness into a follow-up task, added lint, validate and bump steps.
