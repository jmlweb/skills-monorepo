---
id: LRN-061
title: Declare the few switch flags that may appear bare; every other flag must carry a value
status: active
tags: [cli, args, flowstate, dev-workflow, atlassian-polish]
task: TSK-062
created: 2026-11-07
---

## Context
TSK-062: the hand-rolled parsers stored `"true"` for `--title ""` or `--title --x`, so entities titled `true` were written with exit 0. The parser cannot tell `--title --x` from a boolean flag followed by another flag.

## Insight
Declaring the few flags that may appear bare (found by grepping skills and READMEs for bare uses) lets every other flag fail loudly without touching the 40+ `flags["x"]` read sites, and unknown bare flags (typos) now fail too. The sets live in `core/args.ts` of each plugin: flowstate `json, private, dry-run, all, include-archived`; dev-workflow `json, include-private, help`; atlassian-polish `pretty`. An empty value is kept literally; `required()` and `validateTitle` reject blank input.

## Application
Add a flag to the plugin's `SWITCHES` set only when a skill passes it bare (for example a future `setup --github`); everything else takes a value.
