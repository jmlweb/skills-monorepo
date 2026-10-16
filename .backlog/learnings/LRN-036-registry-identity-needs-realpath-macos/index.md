---
id: LRN-036
title: Registry identity needs realpath: macOS temp dirs alias /var and /private/var
status: active
tags: [flowstate, macos, paths]
task: TSK-051
created: 2026-10-16
---

Context: on macOS, mkdtemp under /var/folders resolves to /private/var/folders. resolveBacklog returns the path as given, but the registry stores what registerBacklog received. Without normalisation, the same backlog can appear under two spellings: the current backlog then shows up as a "shared" source and returns duplicate results.

Insight: canonicalise both sides before comparing or deduping backlog paths. Use realpathSync when the path exists, and resolve() otherwise. Apply it when storing the registry entry, when excluding the current backlog, and when deduping entries.

Application: any new path-identity check in flowstate (registry, dedupe, exclusion) goes through canonicalBacklogPath in src/core/registry.ts. Cover it with a test that uses both spellings.
