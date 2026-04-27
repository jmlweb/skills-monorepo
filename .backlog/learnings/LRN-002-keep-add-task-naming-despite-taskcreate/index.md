---
id: LRN-002
title: Keep add-task naming despite TaskCreate reminder collision
status: active
tags: [flowstate, naming, skill-design, decisions]
task: TSK-015
created: 2026-04-27
---

## Context

Reading flowstate/SKILL.md and add-task/SKILL.md fires a Claude Code system-reminder about the native TaskCreate tool. Heuristic likely matches the substring `task` plus low recent TaskCreate usage. Considered renaming the skill to reduce collision (e.g., add-backlog-item, new-task, track-item).

## Insight

Naming consistency across the plugin matters more than silencing a system-reminder:

- Six skills already use the `*-task` suffix: `add-task`, `start-task`, `complete-task`, `block-task`, `next-task`, `check-task`. Renaming only one breaks the pattern; renaming all has a huge blast radius and breaks user muscle memory.
- The reminder is harness-side noise — it does not change skill output or user experience. Humans don't see it.
- Alternative names either (a) still contain "task" (the reminder trigger), or (b) introduce a generic word like "item" that obscures intent.

## Application

- Do NOT rename `add-task` (or any `*-task` skill) on the basis of system-reminder collisions alone.
- If the reminder noise becomes load-bearing (e.g., users complain in transcripts), prefer reducing literal "task" mentions in the skill prose (use "ticket" or "work item" in description text) before renaming the slash command.
- Reconsider only if Claude Code introduces a way to suppress reminders per-skill, or if a future change makes the collision affect actual skill behavior.

Decision: keep current naming. TSK-015 closed as won't-fix.
