---
id: RPT-030
title: flowstate CLI silently ignores unknown flags that carry a value
type: bug
severity: medium
status: triaged
created: 2026-11-10
triaged: 2026-11-10
task-id: TSK-085
---

## Summary
`plugins/flowstate/src/core/args.ts:13-37` (`parseArgs`) stores every `--key value` pair without
checking `key` against the flags the command accepts. LRN-061 made unknown *bare* flags fail, but
a misspelt flag followed by a value is accepted and dropped. The command exits 0 and reports
success while the requested change is lost.

## Reproduction
In a fresh directory after `flowstate setup`:

    echo b | node dist/bin/flowstate.js task-create --title z --priority P2 --tag cli --depends TSK-001 --body -

Observed: exit 0, `id: TSK-002`. The file holds `tags: []` and `depends-on: []`. The real flags
are `--tags` and `--depends-on` (`task-create --help`).

    node dist/bin/flowstate.js task-update TSK-001 --tick 1

Observed: exit 0, prints `path: …/TSK-001-y.md`, no criterion ticked. The real flag is `--check`.

## Impact
Skills and agents call the CLI unattended and trust exit 0. A typo or a flag name from an older
version drops tags, dependencies, criteria ticks or progress silently. AGENTS.md asks for
"actionable messages" from typed errors.

## Suggested fix
Give each command an allowlist of its flags (the help text already lists them) and throw
`InvalidArgumentError` naming the unknown flag and the accepted ones. Exit code 1, like other
validation failures.
