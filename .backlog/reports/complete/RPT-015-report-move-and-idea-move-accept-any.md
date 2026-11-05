---
id: RPT-015
title: report-move and idea-move accept any --status value and move the entity to complete
type: bug
severity: medium
status: triaged
created: 2026-10-26
triaged: 2026-10-26
task-id: TSK-063
---

## Observed

`report-move` and `idea-move` never validate `--status`. Any string is written to frontmatter and the entity moves to `complete/`, exit 0. The move cannot be redone: a second `report-move` fails with `Entity "RPT-001" not found in reports/pending`.

## Location

- `plugins/flowstate/src/bin/flowstate.ts:556` — `required(flags, "status") as "approved" | "discarded"` (cast only, no check)
- `plugins/flowstate/src/bin/flowstate.ts:606` — `required(flags, "status") as "triaged" | "discarded"` (cast only, no check)
- `plugins/flowstate/src/commands/report-move.ts:18` and `plugins/flowstate/src/commands/idea-move.ts:18` — `fm["status"] = status` with no validation

Contrast: `task-move --to bogus` exits 1 with `Invalid --to value: "bogus". Must be one of: active, complete, pending`.

## Reproduction

In a scratch repo (`flowstate setup` done):

```
$ echo b | flowstate report-create --title x --type bug --severity low --body -
$ flowstate report-move RPT-001 --status bogus      # exit 0
path: .../.backlog/reports/complete/RPT-001-x.md
$ flowstate report-list --status all
RPT-001	x	bug	low	bogus	2026-10-26	...
$ flowstate report-move RPT-001 --status triaged    # exit 1
Error: Entity "RPT-001" not found in reports/pending

$ echo b | flowstate idea-create --title y --complexity low --body -
$ flowstate idea-move PLN-001 --status approvedd    # exit 0, frontmatter status: approvedd
```

A typo in a triage run silently closes the report or idea with an invalid status.

## Related, distinct

TSK-062 covers empty or `--`-prefixed flag values stored as `true`. This report covers well-formed but out-of-enum values.
