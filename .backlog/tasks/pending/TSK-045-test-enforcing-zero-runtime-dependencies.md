---
id: TSK-045
title: Test enforcing zero runtime dependencies in plugins
status: pending
priority: P2
tags: [ci, test, guardrail]
created: 2026-10-08
source: TSK-030
depends-on: []
---

# Test enforcing zero runtime dependencies in plugins

## Description

From AGENTS.md mistake 3 and invariant 3. Fail when any plugins/*/package.json has a dependencies key or a devDependency outside @types/node, typescript, vitest. Add as a node:test in scripts/ or a pre-commit.mjs step.

## Acceptance Criteria

- [ ] Test fails on a dependencies key
- [ ] Test fails on a devDependency outside the allowlist
- [ ] Passes on the current tree, pnpm test green

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created