---
id: LRN-015
title: Test not-on-main by checking out the tagged commit
status: active
tags: [testing, release, node-test]
task: TSK-044
created: 2026-10-08
---

## Context
check-release-tag.mjs reads package.json from the working tree but ancestry from git history. Switching back to main before asserting made the version check fail first.
## Insight
In CI the checkout is the tag itself, so tests must leave the sandbox on the tagged commit for the ancestry check to be the one that fails.
## Application
Don't check out main before asserting the not-on-main failure.
