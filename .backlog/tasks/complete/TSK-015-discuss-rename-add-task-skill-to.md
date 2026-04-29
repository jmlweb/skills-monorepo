---
id: TSK-015
title: Discuss: rename add-task skill to reduce semantic collision with native TaskCreate
status: complete
priority: P3
tags: [flowstate, skill, naming, discuss]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
condensed: true
---

# Discuss: rename add-task skill to reduce semantic collision with native TaskCreate

## Description

Reading flowstate SKILL.md fires Claude Code system-reminder about TaskCreate native tool — likely confusion between flowstate task and native task tool. Possible rename: add-task → add-backlog-item. BREAKING for users; needs alias period. Decision needed before implementing.

## Acceptance Criteria

- [ ] Decision documented: rename / keep / alias
- [ ] If rename: new name chosen and migration path defined
- [ ] Backwards-compat alias for at least one minor version
- [ ] All cross-skill references updated
- [ ] CHANGELOG entry

## Notes

## Learnings

- LRN-002: Keep add-task naming despite TaskCreate reminder collision
## Progress Log

- [2026-04-27] Created
- [2026-04-27] Completed
- [2026-04-29] Condensed
