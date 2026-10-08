---
id: LRN-009
title: Root plugin validate only checks marketplace; validate the plugin dir for agents/skills
status: active
tags: [claude-code, plugin-validation, agents]
task: TSK-021
created: 2026-10-08
---

## Context
After adding `agents/pr-writer.md`, `claude plugin validate .` at repo root printed only "Validating marketplace manifest ... passed".
## Insight
Plugin manifest and agent discovery are checked only when validating the plugin directory itself.
## Application
When adding agents or skills run both `claude plugin validate .` and `claude plugin validate plugins/<name>`.
