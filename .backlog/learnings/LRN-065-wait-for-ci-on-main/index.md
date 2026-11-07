---
id: LRN-065
title: Wait for CI on main before pushing a release tag; CLI-spawning suites need an explicit vitest timeout
status: active
tags: [release, ci, testing, vitest, flowstate]
task: TSK-081
created: 2026-11-07
---

## Context
Release of flowstate v2.19.0 (2026-11-07): main was pushed and the tag followed at once. CI run 42354711632 then failed on Node 24 only: `flowstate.github.integration.test.ts > runs the task, idea and report lifecycle through issues` took 5.9 s on the runner and hit vitest's 5 s default timeout. Locally and on Node 22 it passed. The Release workflow still succeeded because it only checks the tag against package.json.

## Insight
A test that spawns the compiled CLI many times (each call spawns node plus the stub gh) is runner-speed bound and must carry its own timeout: `describe("...", { timeout: 60_000 }, ...)`. The sibling suite already sets 10 s on each spawn. A green local run is not evidence for CI timing.

## Application
Release order: push main, `gh run watch <id> --exit-status` until CI is green, then push the tag. Any new suite that spawns the CLI gets an explicit vitest timeout in the same commit.
