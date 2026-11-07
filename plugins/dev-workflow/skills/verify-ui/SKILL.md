---
name: verify-ui
argument-hint: [surfaces, paths or globs]
description: Checks a UI change in a real Chrome against the project's verify-ui contract and reports a delta table of FAIL, PENDING, KNOWN and PASS rows. Use when the user says "verify the UI", "check the UI in the browser", "audit the UI change", "does the page still match the contract", or after editing components, styles or pages in a project that has docs/verify-ui.md. Not for launching the project or a screenshot by itself (use run) or reviewing a pull request (use review-pr).
allowed-tools: Read, Grep, Glob, ToolSearch, Agent, Bash
model: sonnet
effort: medium
---

# Verify UI

Measure a UI change in the browser against `docs/verify-ui.md`, the project's **contract**, and
relay what the measuring agent found. The agent measures; this skill owns the dev server, the
scope and the conversation. Contract format, shorthands and status rules:
`${CLAUDE_PLUGIN_ROOT}/references/verify-ui-contract.md`. Read it when the contract is missing
(to point the user at the format) or when a section does not parse.

## Arguments

`$ARGUMENTS` (optional):

- Surface names (`Home, Pricing`) → those surfaces.
- Paths or globs → surfaces whose `Scope` column matches.
- Empty → surfaces matched by the current diff (step 2).

## Prerequisites

1. **Contract.** Read `docs/verify-ui.md` from the project root. Missing → stop with:
   `verify-ui needs docs/verify-ui.md (base URL, surfaces, viewports, invariants). Format:
   ${CLAUDE_PLUGIN_ROOT}/references/verify-ui-contract.md`. A contract without an `App`,
   `Surfaces`, `Viewports` or `Invariants` section stops the same way, naming the section.
2. **Browser.** The session must expose the `chrome-devtools` MCP server: a tool named
   `mcp__chrome-devtools__evaluate_script` is in the tool list (`ToolSearch` with
   `select:mcp__chrome-devtools__evaluate_script` when tools are deferred), and
   `claude mcp list` shows `chrome-devtools: … ✔ Connected`. Either missing → stop with:
   `verify-ui needs the chrome-devtools MCP server. Add it with
   claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --isolated, then run
   /mcp to confirm it is connected. A server under another name exposes tools under that
   name, which the ui-auditor agent cannot see.`
   The report is produced only by the browser; a run without one ends here, with the message above.

Done when: the contract's five sections are held and `mcp__chrome-devtools__evaluate_script` is confirmed present.

## Workflow

### 1. Probe or start the app

Probe the base URL: `curl -s -o /dev/null -w '%{http_code}' <base url>`. A 2xx or 3xx means the
app is up; record `server: already running`.

Otherwise run the contract's `Start` command from the project root in the background and probe
every 2 seconds for up to 60 seconds, using `Ready when` where the contract defines it. Record
`server: started by verify-ui`. Still down after 60 seconds → stop with the last probe result and
the server's last output lines; the user fixes the start command or the port.

Done when: the probe passed and the server line is recorded.

### 2. Resolve the scope

Apply the first rule that holds, and keep its name for the report:

1. `$ARGUMENTS` names surfaces → `argument: surfaces`.
2. `$ARGUMENTS` names paths or globs → match them against `Scope` → `argument: paths`.
3. `git diff --name-only HEAD` (working tree, staged and unstaged); when empty,
   `git diff --name-only $(git merge-base HEAD origin/HEAD 2>/dev/null || git merge-base HEAD main)...HEAD`.
   Match the files against `Scope` → `diff`.
4. No match, or no `Scope` column → every surface → `all surfaces`.

Done when: a non-empty surface list and its rule are known.

### 3. Delegate the measurement

Invoke the `Agent` tool with `subagent_type: "dev-workflow:ui-auditor"` and `model: "sonnet"`.
The prompt carries, pasted in full (the agent sees nothing from this conversation): the base
URL, the contract's `Surfaces`, `Viewports`, `Invariants`, `Pending` and `Known` tables, the
surface list from step 2 with its rule, and the sentence "Reply in the output shape of your
definition." Wait for the reply.

A reply starting with `MISSING:` → stop and show it with the matching prerequisite message
from above; nothing is reported as passing.

The browser is the agent's: measurements come from its reply only. The main thread never
opens a page or evaluates a script itself, so one run has one source of truth.

Done when: the reply holds a table and a `VERDICT:` line, or the run stopped on `MISSING:`.

### 4. Report

Print, in this order:

1. `Contract: docs/verify-ui.md · server: <line from step 1> · scope: <surfaces> (<rule>)`
2. The agent's table, verbatim.
3. The agent's `Skipped:` list, verbatim. Lead it with `Skipped checks:` when it holds entries
   other than `none`, so a narrowed run never reads as complete.
4. The `VERDICT:` line, verbatim.
5. One next step: with `FAIL` rows, offer to investigate the first one (`A`) or to leave the
   report as is (`B`); fixing starts only when the user picks `A` and confirms the change.
   With no `FAIL` rows, suggest pruning `Pending` entries whose rows passed.

A server started in step 1 is stopped after the report and the stop is stated on the last line.

Done when: the four blocks are printed and the server line matches the server's actual state.
