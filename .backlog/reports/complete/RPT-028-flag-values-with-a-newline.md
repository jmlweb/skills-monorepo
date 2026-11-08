---
id: RPT-028
title: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags)
type: bug
severity: medium
status: triaged
created: 2026-11-08
triaged: 2026-11-08
task-id: TSK-083
---

## Observed

`serializeFrontmatter` writes every value with `String(value)` and never rejects or escapes a newline. Free-text flags that land in frontmatter are not checked for newlines (only `--title` is: "Invalid title: it must be a single line"). A value holding `\n` therefore writes a second `key: value` line, and the parser lets the later key win. Exit code is 0 every time.

Affected flags seen: `report-move --task-id`, `idea-move --task-id`, `task-block --reason`, `task-create --tags`. Skills pass these from model or user text (block reasons especially), so the input is not always controlled.

## Location

- `plugins/flowstate/src/core/frontmatter.ts:53` — `lines.push(\`${key}: ${serializeValue(value)}\`)`
- `plugins/flowstate/src/core/frontmatter.ts:61` — `serializeValue` returns `String(value)` / `[${value.join(", ")}]` unchanged
- `plugins/flowstate/src/bin/flowstate.ts:652` and `:702` — `flags["task-id"]` passed through with no format check (also accepts `--task-id banana`)

## Reproduction

Scratch repo, `flowstate setup` done, CLI from main:

```
$ flowstate report-create --title r --type bug --severity low
$ flowstate report-move RPT-001 --status triaged --task-id $'TSK-001\nseverity: critical'   # exit 0
$ head -11 .backlog/reports/complete/RPT-001-r.md
...
severity: low
status: triaged
...
task-id: TSK-001
severity: critical
---
$ flowstate report-list --status all --json true    # "severity": "critical"

$ flowstate task-create --title t --priority P3
$ flowstate task-block TSK-001 --reason $'waiting\npriority: P1'                          # exit 0
$ flowstate task-list --json true                    # "priority": "P1"
```

## Suggested fix

Reject a newline in any scalar frontmatter value at the serializer (throw a typed error), plus a per-flag message at the CLI boundary like the existing title check. Validate `--task-id` against the task ID format.
