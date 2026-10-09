---
id: LRN-030
title: Section helpers in markdown.ts are not fence-aware
status: active
tags: [flowstate, markdown, cli]
task: TSK-042
created: 2026-10-09
---

findSection/hasSection/replaceSection match the first `## X` line even inside a code fence. A fenced `## Notes` in Description makes task-condense trim the wrong section. embedUnderDescription/mergeDuplicateNotes are fence-aware; the older helpers are not.
