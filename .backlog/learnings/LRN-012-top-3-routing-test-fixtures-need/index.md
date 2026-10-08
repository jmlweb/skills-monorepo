---
id: LRN-012
title: Top-3 routing test fixtures need more than 3 skills
status: active
tags: [testing, routing, tf-idf]
task: TSK-039
created: 2026-10-08
---

## Context
Fixture tests for "positive outside top 3" kept passing with 3 skills.
## Insight
With 3 skills top-3 is the whole list, so those checks can never fail. Zero-score ties break alphabetically in rankSkills.
## Application
Keep at least 5 skills in routing-eval.test.mjs fixtures.
