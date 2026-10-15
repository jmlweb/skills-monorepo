---
id: TSK-049
title: Triage all pending reports sequentially when triage-report gets no argument
status: active
priority: P3
tags: []
created: 2026-10-15
source: idea/PLN-024
depends-on: []
started: 2026-10-15
---

# Triage all pending reports sequentially when triage-report gets no argument

## Description

### Goal

Make `/flowstate:triage-report` with no argument walk every pending report in one run instead of asking which single report to triage. With an ID argument, behaviour stays as today.

### Approach

1. Step 1: with no argument, collect every report in `{{BACKLOG}}/reports/pending/`, read each frontmatter `severity`, order critical → high → medium → low, then ID ascending. Keep the existing empty-directory prerequisite (LRN-001). With an argument, resolve that single report as today.
2. Wrap steps 2–5 in a per-report loop; "yes" accepts the recommendation; the menu gains "stop" to end the run.
3. Reports marked "needs more info" stay in `reports/pending/` and are not revisited in the same run.
4. Closing step: one line per report (`→ TSK-XXX`, `discarded`, `needs info`, `not reached`) plus the count still pending. Single-report runs keep today's confirmation.
5. Update `argument-hint` and the Arguments section. Leave `description` unchanged (LRN-018, LRN-026: routing eval is sensitive to description rewrites).
6. Update `plugins/flowstate/README.md` (~line 160), `plugins/flowstate/SKILL.md` (~line 86) and `plugins/flowstate/skills/guide/SKILL.md` (~line 45). Read `docs/writing-skills.md` before editing. Run `pnpm lint:skills` and `claude plugin validate plugins/flowstate`.

Version bump and release notes are part of the release step, not this task. Note the behaviour change (bare command now loops) there.

## Acceptance Criteria

- [ ] Bare /flowstate:triage-report walks every pending report ordered by severity (critical to low) then ID ascending, reading severity from each report frontmatter
- [ ] An ID argument still triages only that report
- [ ] Each report runs summary, investigate, recommend, confirm; the menu offers stop, which ends the run
- [ ] Reports marked needs more info stay pending and are not revisited in the same run
- [ ] The run ends with one line per report outcome and the count still pending
- [ ] argument-hint, Arguments section, README row, root SKILL.md table and guide wording describe both modes; description frontmatter unchanged
- [ ] pnpm lint:skills and claude plugin validate plugins/flowstate pass; SKILL.md body stays under 150 lines

## Notes

## Learnings

## Progress Log

- [2026-10-15] Created
- [2026-10-15] Started