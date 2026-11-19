---
id: LRN-070
title: flowstate CLI flags live in two tables: COMMAND_HELP and COMMAND_FLAGS
status: active
tags: [cli, args, flowstate]
task: TSK-085
created: 2026-11-19
---

Since TSK-085 every flowstate command validates its flags against `COMMAND_FLAGS` in `src/bin/flowstate.ts` (`--json` is added for all). A new flag must go into both `COMMAND_HELP` and `COMMAND_FLAGS`: missing from the allowlist, the flag fails with exit 1; missing from help, the help text lies. Commands absent from `COMMAND_FLAGS` skip validation on purpose, so the switch still prints "Unknown command". Validation runs inside main's try block, so `--json true` callers get `{"error": ...}` on stderr.
