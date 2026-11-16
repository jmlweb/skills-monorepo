---
id: LRN-069
title: md-to-adf inline code only pairs single backticks, so backtick fence info strings must reject backticks
status: active
tags: [atlassian-polish, md-to-adf]
task: TSK-084
created: 2026-11-16
---

CommonMark forbids backticks in a backtick fence's info string. md-to-adf keeps that rule (FENCE_RE uses `[^`]*` after a backtick run): without it a line like "```a``` b" would open a fence and swallow the rest of the document until an "unclosed code fence" error. Tilde fences have no such limit.

Separately, the inline parser only pairs single backticks: "```a``` b" renders as text "``", code "a", text "`` b". Multi-backtick code spans are not supported; tests assert only that such a line stays a paragraph.

Also: `pnpm build` (turbo) can fail locally with "Exec format error (os error 8)" spawning tasks; `pnpm -r --filter './plugins/*' run build|typecheck|test` runs the same per-plugin scripts without turbo.
