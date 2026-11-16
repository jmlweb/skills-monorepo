---
id: RPT-034
title: task-update --set tags= or depends-on= writes a scalar that every reader drops
type: bug
severity: medium
status: triaged
created: 2026-11-16
triaged: 2026-11-16
task-id: TSK-089
---

## Observed

`task-update --set key=value` writes every value as a plain string. `tags` and `depends-on` are list fields: `task-create` writes them as YAML arrays (`--tags a,b` → `tags: [a, b]`). After `--set tags=x,y` the file holds the scalar `tags: x,y`, and every reader treats a non-array as no tags. The task's tags are silently lost, with exit 0. `--set depends-on=TSK-001` stores the scalar `depends-on: TSK-001` the same way, so the field no longer matches the `readonly string[]` shape in `src/core/types.ts:38`.

## Location

- `plugins/flowstate/src/commands/task-update.ts:73-75` — `fm[key] = value` copies the raw string for every key; only `priority` and `title` are validated (lines 59-60), and no key is split into a list
- `plugins/flowstate/src/commands/index-rebuild.ts:50` and `:162` — `Array.isArray(fm["tags"]) ? … : []` / `""`: a scalar reads back as empty
- `plugins/flowstate/src/bin/flowstate.ts:440-441` — `task-create` splits `--depends-on` on commas; `task-update` has no equivalent

## Reproduction

Built CLI from `main` (6d930bb), scratch git repo after `flowstate setup`:

```
$ flowstate task-create --title y --priority P2 --tags a,b
$ flowstate task-list --json true | jq -c '.[0].tags'
["a","b"]
$ flowstate task-update TSK-001 --set tags=x,y      # exit 0
$ grep tags .backlog/tasks/pending/TSK-001-y.md
tags: x,y
$ flowstate task-list --json true | jq -c '.[0].tags'
[]
```

`index-rebuild --type tasks` then writes an empty Tags cell for TSK-001. Expected: either `tags: [x, y]` (split on commas like `task-create`), or exit 1 telling the caller the key is a list field.
