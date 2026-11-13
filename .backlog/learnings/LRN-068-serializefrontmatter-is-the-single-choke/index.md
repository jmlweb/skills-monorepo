---
id: LRN-068
title: serializeFrontmatter is the single choke point for injected frontmatter keys
status: active
tags: [flowstate, frontmatter, validation]
task: TSK-083
created: 2026-11-13
---

The frontmatter format is one `key: value` per line and `parseFrontmatter` lets a later key win, so any line break in a value silently overrides another key (RPT-028). Both the file backend (`writeEntity`) and the GitHub metadata block (`metadata-block.ts`) serialize through `serializeFrontmatter`, which now throws `InvalidArgumentError` on `\r`/`\n` in a scalar or array item. `writeEntity` serializes before touching disk, so a throw leaves the file intact.

Per-flag checks at the CLI boundary (`validateSingleLine`) exist only for clearer messages; the serializer guard is the real defence for any new flag.
