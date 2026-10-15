---
id: LRN-033
title: Static assertion-call count rejects valid table folds
status: active
tags: [testing, refactoring, verification]
task: TSK-050
created: 2026-10-15
---

## Context
Folding N similar tests into one table loop was rejected by the verifier, because the assertion-call count in the source dropped (7 → 5).

## Insight
A loop or table runs one assertion call once per row. A lower static count does not mean a lost check; the passed-case count does (8 → 8 held).

## Application
When a check is a static count, back it with a runtime number, or relax it only for the transformation where it's known to hold (`--claim fold`). Never relax it for every rewrite.
