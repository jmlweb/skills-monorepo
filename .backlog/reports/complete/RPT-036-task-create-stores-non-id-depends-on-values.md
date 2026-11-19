---
id: RPT-036
title: task-create stores non-ID depends-on values and empty tags
type: bug
severity: low
status: triaged
created: 2026-11-19
triaged: 2026-11-19
task-id: TSK-091
---

## Summary

`task-create` splits `--depends-on` and `--tags` on commas and stores every piece without validation (`plugins/flowstate/src/bin/flowstate.ts:436` for tags, `:440-442` for depends-on).

- `--depends-on` accepts any text, for example `garbage` or a typo like `TSK-12`. The next-task skill labels a task **Blocked** when `depends-on` names a task that is not complete (`plugins/flowstate/skills/next-task/SKILL.md:46`). A dangling or malformed ID never completes, so the task stays Blocked with no error at creation time.
- `--tags 'a, ,b'` (or a trailing comma, `--tags 'a,'`) writes an empty tag: `tags: [a, , b]`. `task-list --json` then returns `"tags": ["a", "", "b"]`.

## Reproduction (fresh temp repo, flowstate 2.19.1 dist)

```
$ flowstate task-create --title F --priority P3 --depends-on garbage; echo rc=$?
id: TSK-005
rc=0
$ grep depends-on .backlog/tasks/pending/TSK-005-f.md
depends-on: [garbage]
$ flowstate task-create --title E --priority P3 --tags 'a, ,b'
$ grep tags: .backlog/tasks/pending/TSK-004-e.md
tags: [a, , b]
$ flowstate task-list --json true | jq -c '.[] | select(.id=="TSK-004") | .tags'
["a","","b"]
```

## Expected

The CLI drops empty entries from `--tags` (or rejects them). It rejects any `--depends-on` entry that is not a task ID (`TSK-\d{3,}`, per LRN-067) and exits 1 naming the bad value. Checking that the referenced task exists is optional.
