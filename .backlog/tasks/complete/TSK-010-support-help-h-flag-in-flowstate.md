---
id: TSK-010
title: Support --help/-h flag in flowstate CLI globally and per subcommand
status: complete
priority: P2
tags: [flowstate, cli, dx]
created: 2026-04-27
source: manual
depends-on: []
started: 2026-04-27
completed: 2026-04-27
---

# Support --help/-h flag in flowstate CLI globally and per subcommand

## Description

flowstate.js --help returns 'Unknown command: --help'. POSIX-inconsistent. Add -h/--help support: top-level prints command list, per-subcommand prints flags + usage.

## Acceptance Criteria

- [ ] flowstate --help prints command list and exits 0
- [ ] flowstate -h equivalent
- [ ] flowstate task-create --help prints flags and exits 0
- [ ] All subcommands accept --help
- [ ] Unknown command still exits 1 with hint to run --help

## Notes

## Learnings

## Progress Log

- [2026-04-27] Created
- [2026-04-27] Started
- [2026-04-27] Implemented --help/-h support: top-level prints command list, per-subcommand prints usage, both exit 0. Unknown command exits 1 with hint. Added 5 integration tests (178/178 passing).
- [2026-04-27] Completed