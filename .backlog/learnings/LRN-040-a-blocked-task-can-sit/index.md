---
id: LRN-040
title: A blocked task can sit in tasks/pending, so status does not say where a task lives
status: active
tags: [flowstate, store, tasks]
task: TSK-057
created: 2026-10-22
---

`task-block` accepts pending and active tasks and sets `status: blocked` without moving the file. So a `blocked` status can live in `tasks/pending/` (never started) or `tasks/active/` (started). The frontmatter status alone cannot answer "is this task started?" or "which folder is it in?".

`BacklogStore` therefore works in buckets (`pending`, `active`, `complete`), not statuses: a bucket is where the entity sits, the status is what the frontmatter says. Skills that need "pending vs started" must query by bucket (`task-list --status pending` / `--status active`), not filter an unfiltered `task-list` by its `status` field. A GitHub backend has to keep the same distinction (for example, open with `status:blocked` and no started date still counts as pending).
