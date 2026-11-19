---
id: RPT-035
title: task-update --set accepts malformed keys that bypass the status and priority guards
type: bug
severity: medium
status: triaged
created: 2026-11-19
triaged: 2026-11-19
task-id: TSK-090
---

## Summary

`task-update --set` splits each pair at the first `=` and uses the left side as a frontmatter key with no validation (`plugins/flowstate/src/bin/flowstate.ts:501-507`). `taskUpdate` only guards exact key names (`plugins/flowstate/src/commands/task-update.ts:46-61`), and `serializeFrontmatter` writes keys verbatim (`plugins/flowstate/src/core/frontmatter.ts:53`). `parseFrontmatter` splits each line at its first `:` (`frontmatter.ts:22-25`), so a key that contains `:` is read back as a different key.

Three failure modes:

1. A key containing `:` overrides a guarded field. `--set 'priority:P9=x'` writes the line `priority:P9: x`, which reads back as `priority: "P9: x"`. This bypasses `validatePriority`. `--set 'status:bogus=x'` bypasses the "Cannot set status via task-update" guard the same way.
2. An empty or spaced key writes a malformed line: `--set '=oops'` writes `: oops`, and `--set 'my key=v'` writes `my key: v`.
3. A pair without `=` is dropped silently with exit 0: `--set priority:P1` changes nothing.

## Reproduction (fresh temp repo, flowstate 2.19.1 dist)

```
$ flowstate task-update TSK-002 --set 'priority=P9'
Error: Invalid priority: "P9". Expected: P1, P2, P3, P4      # guard works for the exact key
$ flowstate task-update TSK-002 --set 'priority:P9=x'; echo rc=$?
rc=0
$ flowstate task-update TSK-002 --set 'status:bogus=x'; echo rc=$?
rc=0
$ head -10 .backlog/tasks/pending/TSK-002-b.md
priority: P9: x
...
status:bogus: x
$ flowstate task-doctor
TSK-002 ... pending  bogus: x  pending
$ flowstate task-update TSK-001 --set priority:P1; echo rc=$?
rc=0          # priority still P3
$ flowstate task-update TSK-001 --set '=oops'     # writes ": oops" into frontmatter
```

## Expected

The CLI rejects a `--set` pair without `=` and any key that is not a plain identifier (for example `^[a-z][a-z0-9-]*$`). It exits 1 with an actionable message and leaves the file untouched.
