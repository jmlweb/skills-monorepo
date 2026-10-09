---
id: LRN-029
title: Piping pnpm bump to head can abort the bump via SIGPIPE
status: active
tags: [pnpm, bump, tooling]
task: TSK-033
created: 2026-10-09
---

## Context
`pnpm bump patch | head -4` looked successful but left the version unchanged; rerun unpiped worked.
## Insight
Truncating bump-plugin.sh output kills it before the version write.
## Application
Run `pnpm bump` unpiped and confirm the new version in package.json.
