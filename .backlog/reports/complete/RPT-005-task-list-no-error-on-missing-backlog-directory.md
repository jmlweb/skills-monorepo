---
id: RPT-005
title: "task-list and other read commands don't error when .backlog/ is missing"
type: bug
severity: low
status: discarded
created: 2026-04-10
triaged: 2026-04-10
---

## Summary

`listFiles()` in `dist/core/fs.js` silently returns an empty array when the target directory
doesn't exist. This means every read command (`task-list`, `stats`, `learning-search`, etc.)
succeeds with empty results when invoked outside a project with a `.backlog/` directory.

Exit code is 0. No warning is emitted.

## Expected Behavior

When `.backlog/` does not exist at the resolved `cwd`, the CLI should exit with code 1 and
a message like:

```
Error: No .backlog/ directory found. Run 'flowstate init' to create one, or change to a project directory.
```

## Relationship to RPT-003

This is the underlying mechanism that makes RPT-003 (silent failure on wrong cwd) possible.
Even if RPT-003 is fixed with parent-directory walking, this guard should exist as a safety
net for cases where `.backlog/` genuinely doesn't exist.

## Suggested Fix

Add a guard at the top of `main()` in `dist/bin/flowstate.js`, after resolving `cwd`:

```typescript
const backlog = join(cwd, '.backlog');
if (command !== 'init' && !fs.existsSync(backlog)) {
  console.error('Error: No .backlog/ directory found at ' + cwd);
  console.error('Run "flowstate init" or change to a project directory.');
  process.exit(1);
}
```

The `init` command should be exempted since it creates the directory.
