---
id: RPT-006
title: review-idea approve nests idea headings under empty Description and duplicates Notes
type: bug
severity: low
status: pending
created: 2026-10-08
---

## Summary

Tasks created by `review-idea` approve have an empty `## Description` heading immediately followed by the idea's own `## Goal` / `## Context` / `## Approach` headings, and some (TSK-025, TSK-026) end up with two `## Notes` sections.

## Cause

`plugins/flowstate/skills/review-idea/SKILL.md` step 5a pipes `{{PLAN_GOAL_AND_APPROACH}}` verbatim into `task-create --body -`. `task-create` (`src/commands/task-create.ts`) places the body under its own `## Description` and appends a template `## Notes`. Any `##` heading in the piped text becomes a sibling of Description, leaving Description empty; an idea `## Notes` section duplicates the template one.

## Evidence

- TSK-021, TSK-025..TSK-041: `## Description` followed by blank line and `## Goal`.
- TSK-025, TSK-026: two `## Notes` headings (idea Notes + template Notes).

## Impact

Cosmetic, but `hasSection`/section-based tools (task-compress PROTECTED_SECTIONS, condense Notes trim) may act on only the first `## Notes`, leaving the second untrimmed.

## Possible fixes

- Skill: demote piped headings one level (`##` → `###`) and fold idea Notes into Description, or
- CLI: `task-create` demotes `##` headings inside `--body` and merges a body `## Notes` into the template Notes section (tested).
