---
id: RPT-014
title: CLI arg parsers store true for flag values that are empty or start with --
type: bug
severity: medium
status: triaged
created: 2026-10-24
triaged: 2026-10-24
task-id: TSK-062
---

## Summary

The flowstate CLI arg parser treats a flag value as missing when it is an empty string or starts with `--`. It then stores the literal string `"true"` as the value and exits 0. Titles and Progress Log entries are silently written as `true`.

## Location

- `plugins/flowstate/src/bin/flowstate.ts:193` — `if (next && !next.startsWith("--"))`; the else branch at line 198 sets `flags[key] = "true"`.
- `plugins/flowstate/src/bin/flowstate.ts:239` — `required()` only checks truthiness, so `"true"` passes and whitespace-only values pass too.
- Same parser shape: `plugins/dev-workflow/src/bin/dev-workflow.ts:93`, `plugins/atlassian-polish/src/bin/atlassian-polish.ts:45`.

## Reproduction

Built CLI at `plugins/flowstate/dist/bin/flowstate.js`, fresh `flowstate setup` in a temp dir:

```
$ flowstate task-create --title "--json flag ignored" --priority P2
id: TSK-001
path: .../.backlog/tasks/pending/TSK-001-true.md      # exit 0, title: true

$ flowstate task-create --title "" --priority P2
path: .../.backlog/tasks/pending/TSK-002-true.md      # exit 0, title: true

$ flowstate task-create --title "   " --priority P2
path: .../.backlog/tasks/pending/TSK-003-.md          # exit 0, empty slug

$ flowstate task-update TSK-004 --log "--force was needed"
exit 0; Progress Log gains "- [2026-10-24] true"

$ flowstate report-create --title "" --type bug --severity low --body - <<<'x'
path: .../.backlog/reports/pending/RPT-001-true.md
```

## Expected

A value-taking flag followed by an empty string or a `--`-prefixed string should either take that value literally or fail with an actionable error. A blank or whitespace-only `--title` should fail validation instead of creating an entity. Skills pass user text (titles, log lines) into these flags, so user text starting with `--` is realistic.
