---
id: LRN-018
title: Flipping skills to user-invoked shifts the routing rank-1 ratchet
status: active
tags: [routing, testing, skills, invocation]
task: TSK-028
created: 2026-10-08
---

## Context
TSK-028 set `disable-model-invocation: true` on ten skills. routing-eval only ranks model-invoked skills.

## Insight
Every flipped skill must lose its `routing.json` entry, and any negative whose `owner` is a flipped skill must be re-pointed, or the eval reports unknown owners and missing negatives. Removing skills also shrinks the rank-1 denominator, so the ratchet can fall below its stored value with no real regression (50/54 became 33/36). A plugin with one routable skill has no sibling to own a negative, so the negative minimum must be skipped there.

## Application
After a flip, edit routing.json and delete the matching tier-2 `*-fires` evals, then compare the same missed prompts before and after. Lower the ratchet by hand only when the misses are unchanged.
