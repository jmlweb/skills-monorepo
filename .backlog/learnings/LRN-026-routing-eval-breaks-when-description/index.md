---
id: LRN-026
title: Routing eval breaks when description rewrites drop legacy trigger words
status: active
tags: [routing, descriptions, evals, skills]
task: TSK-034
created: 2026-10-09
---

## Context
Shortening the review-pr description dropped a fixture trigger and pushed a positive case to rank 4.
## Insight
Outcome-first rewrites lose words fixtures rely on; restoring the intent as a quoted trigger fixes ranking without touching fixtures.
## Application
Run `node scripts/routing-eval.mjs` after every description edit; fix the description before routing.json.
