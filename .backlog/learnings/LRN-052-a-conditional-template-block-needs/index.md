---
id: LRN-052
title: A conditional template block needs a negative fixture check in the sandbox
status: active
tags: [kickstart, sandbox, templates, testing]
task: TSK-076
created: 2026-11-07
---

## Context
TSK-076 added a `prod-ops` proposal to `kickstart-templates.md` that fires only on an inferred production target. The kickstart sandbox brief auto-accepts every proposal.

## Insight
An auto-accepting brief turns a wrong inference into a written file, so the only cheap evidence that the condition holds is a check that the file is absent in a fixture that must not trigger it.

## Application
When adding a conditional proposal to a template, add the "must not appear" check to `scripts/sandbox-kickstart.mjs` for the fixture that lacks the condition, and fix the artefact's name (here `prod-ops`) so the check stays exact.
