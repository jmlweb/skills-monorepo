---
id: LRN-016
title: CLI --help goes to stderr for dev-workflow and atlassian-polish, stdout for flowstate
status: active
tags: [cli, testing, skill-lint]
task: TSK-038
created: 2026-10-08
---

## Context
Writing the skill-to-CLI contract check that spawns each binary with `--help`.
## Insight
Reading only stdout flagged every dev-workflow and atlassian-polish subcommand as unknown. The binaries differ on which stream carries help. Command descriptions can wrap onto deeper-indented lines, and some names are padded with a single space.
## Application
Parse stdout and stderr together with `spawnSync`. Match command lines with `^ {2}name\s+`.
