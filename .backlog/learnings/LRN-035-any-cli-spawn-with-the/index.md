---
id: LRN-035
title: Any CLI spawn with the real env writes to the shared registry
status: active
tags: [flowstate, testing, registry]
task: TSK-051
created: 2026-10-16
---

Context: shared learnings (TSK-051) auto-register every backlog a CLI command touches into $XDG_CONFIG_HOME/flowstate/backlogs, or ~/.config/flowstate/backlogs. A test or script that spawns dist/bin/flowstate.js with the inherited environment therefore writes its temp path into the developer's real registry. scripts/check-backlog-integrity.mjs did this on every test run; the entries stayed as dead paths and warned on every later search.

Insight: every spawn that uses a temp backlog must isolate sharing. Either set FLOWSTATE_SHARED=off in the spawn env, or point XDG_CONFIG_HOME at a temp dir. Check the real registry (~/.config/flowstate) after running the suite.

Application: when adding a CLI spawn in a test or script, pass env with FLOWSTATE_SHARED=off (or an isolated XDG_CONFIG_HOME). The integration suite sets XDG_CONFIG_HOME at module load for this reason.
