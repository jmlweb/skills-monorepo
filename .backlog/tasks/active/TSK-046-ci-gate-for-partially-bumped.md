---
id: TSK-046
title: CI gate for partially bumped versions
status: active
priority: P3
tags: [ci, versions, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
started: 2026-10-08
---

# CI gate for partially bumped versions

## Description

From AGENTS.md mistakes 2 and 9. Extend the version:sync gate: when a version field changes in a commit without matching changes in package.json, plugin.json, marketplace.json (and flowstate SKILL.md), CI fails with a message pointing to pnpm bump.

## Acceptance Criteria

- [ ] Hand-edit of one version location fails CI with a pnpm bump hint
- [ ] pnpm bump commits pass

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-08] Started