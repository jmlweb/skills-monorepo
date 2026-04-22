---
id: LRN-001
title: Silent error handling in listFiles() masks path resolution bugs
status: active
tags: [testing, error-handling, regressions]
task: 
created: 2026-04-10
---

listFiles() in src/core/fs.ts catches all errors and returns [] (empty array) instead of propagating them. This pattern converts "directory not found" errors into valid-looking empty results, making path resolution bugs invisible.

Example: When process.cwd() resolves to the wrong directory, the .backlog/tasks/pending/ path doesn't exist. listFiles() silently returns [], causing commands to report "no results" instead of "directory not found". This hides the bug entirely.

Impact on testing: Unit tests pass cwd explicitly, bypassing process.cwd(). Integration tests run from the project root. The combination of swallowed errors + happy-path-only test setup created a blind spot for cwd bugs (see RPT-003).

Lesson: Functions that return collections should either:
1. Distinguish "empty result" from "lookup failed" (e.g., throw on missing dir, return [] only for success)
2. Or at minimum, validate that the target directory exists before listing

This pattern likely affects other file-based lookups in the codebase.
