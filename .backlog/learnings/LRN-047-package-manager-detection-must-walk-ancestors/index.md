---
id: LRN-047
title: Package-manager detection must walk ancestors once, not per lockfile
status: active
tags: [dev-workflow, testing, tooling]
task: TSK-059
created: 2026-11-01
---

Checking each lockfile name against all ancestors (`existsInAncestors(root, "pnpm-lock.yaml")`, then yarn, ...) makes a farther lockfile beat a nearer one of a lower-priority name: a stray `/tmp/pnpm-lock.yaml` flipped a fixture's own `yarn.lock` to pnpm. Walk the directories once from the package outward and check every lockfile name per level; the first level with any lockfile decides.

`detectPackageManager` now takes an ordered list of per-directory `hasFile` predicates, which keeps it pure and lets unit tests model nesting without touching disk. To prove hermeticity, run the suite with `TMPDIR` pointing at a dir holding an empty `pnpm-lock.yaml` (run vitest directly; turbo drops `TMPDIR`, see LRN-042).
