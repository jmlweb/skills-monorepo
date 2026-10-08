---
id: PLN-017
title: Audit setup pointers: hard vs soft dependencies
status: discarded
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
---

## Goal
Only skills that cannot function without `.backlog/` (or atlassian setup) carry an explicit "run setup first" pointer; skills that merely work better with it reference it softly or not at all.

## Context
Idea from mattpocock/skills ADR 0001. Hard dependency: output is wrong without setup. Soft: output is only less sharp. Avoids cargo-culting prerequisite blocks that cost tokens.

## Approach
1. List every skill's Prerequisites section across plugins.
2. Classify hard/soft; keep explicit pointer only on hard.
3. Note the rule in AGENTS.md Skills conventions.

## Files to Modify
- `plugins/*/skills/*/SKILL.md` — Prerequisites sections
- `AGENTS.md` — rule

## Risks & Considerations
- Nearly all flowstate skills are hard dependencies; payoff is mainly in dev-workflow / review-pr spec lookup. Low priority.
