---
id: PLN-024
title: Triage all pending reports sequentially when triage-report gets no argument
status: approved
created: 2026-10-15
complexity: low
reviewed: 2026-10-15
task-id: TSK-049
---

## Goal

Make `/flowstate:triage-report` with no argument walk every pending report in one run instead of asking which single report to triage. With an ID argument, behaviour stays as today: triage only that report.

## Context

Today a bare `/flowstate:triage-report` lists `reports/pending/` and asks the user to pick one report; clearing a backlog of reports takes one invocation per report. The skill is user-invoked (`disable-model-invocation: true`), so the change has no routing impact. The CLI has no `report-list` command; the skill reads the pending directory itself, and `report-move` / `task-create` already cover every outcome. Agreed during grilling: no new skill, no `all` keyword, no CLI changes.

## Approach

1. Step 1 (Identify Report): with no argument, collect every report in `{{BACKLOG}}/reports/pending/` and order them by severity (critical → high → medium → low), then by ID ascending. With an argument, resolve that single report as today.
2. Wrap steps 2–5 in a per-report loop: summary → investigate → recommend → confirm → apply. "yes" accepts the recommendation; the menu gains a "stop" option that ends the run before the current report is applied.
3. A report marked "needs more info" (step 5c) stays in `reports/pending/` and is not revisited in the same run.
4. Add a closing step: one line per report with its outcome (`→ TSK-XXX`, `discarded`, `needs info`, `not reached`) and the count still pending. Single-report runs keep the existing confirmation output.
5. Update `argument-hint` to mark the ID as optional and the Arguments section to describe both modes.
6. Update the docs that describe the skill as single-report (see Files to Modify), then run `pnpm lint:skills` and `claude plugin validate plugins/flowstate`.

## Files to Modify

- `plugins/flowstate/skills/triage-report/SKILL.md` — arguments, step 1 ordering, per-report loop with "stop", skip needs-info reports, closing summary step; stay under the 150-line ceiling
- `plugins/flowstate/README.md` — command table row (line ~160): no argument triages all pending reports in order
- `plugins/flowstate/SKILL.md` — command table row (line ~86): "triage a pending report" → "triage pending reports (all, or one by ID)"
- `plugins/flowstate/skills/guide/SKILL.md` — line ~45 mention, if wording implies one report per call

## Risks & Considerations

- Behaviour change in a published skill: users relying on the bare command to pick one report now get the loop. Mitigation: passing an ID keeps single-report mode, and "stop" after the first report gives the old feel. Call it out in the release notes.
- Long runs consume context: each report's investigation (grep, duplicate scan, learning search) accumulates. Keep per-report output to the summary + recommendation blocks, and let "stop" end early.
- Read `docs/writing-skills.md` before editing (positive phrasing, a completion criterion per step); the loop step needs a clear "Done when" (every report decided or stop received).
- `report/SKILL.md` line 78 (`Next: /flowstate:triage-report RPT-{{ID}}`) and `overview/SKILL.md` line 100 stay valid; no change needed.
