---
id: TSK-048
title: Banned-names and stale dist file check
status: active
priority: P3
tags: [ci, test, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
started: 2026-10-09
---

# Banned-names and stale dist file check

## Description

From invariant 7 and mistake 15. Test failing on plan-create, a skill named plan or init, or a plans/ reference outside migration code; also flag dist/ files with no matching src/ module.

## Acceptance Criteria

- [ ] Reserved names fail the test outside migration code
- [ ] Stray dist files without src module are reported
- [ ] Passes on the current tree after clean rebuild

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-09] Started