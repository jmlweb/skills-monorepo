---
id: RPT-003
title: CLI silently returns empty results when cwd is not the backlog root
type: bug
severity: high
status: triaged
created: 2026-04-10
triaged: 2026-04-10
task-id: TSK-008
---

## Summary

All flowstate CLI commands use `process.cwd()` (line 18 of `dist/bin/flowstate.js`) to resolve
the `.backlog/` directory. When the shell's working directory is a subdirectory of the project
(e.g. `apps/core/` after running `pnpm --filter @hustle/core test`), every command silently
returns empty results or fails with cryptic errors instead of warning the user.

## Observed Behavior

```
# From repo root — works
/home/hustle/projects/hustle-monorepo $ flowstate task-list --status pending --json true
[{ "id": "TSK-015", ... }, ...13 items]

# After pnpm changes cwd to apps/core — silently empty
/home/hustle/projects/hustle-monorepo/apps/core $ flowstate task-list --status pending --json true
[]
```

Exit code is 0 in both cases. No warning, no error. The skill prompt has no safeguard
against this either — it invokes the CLI without ensuring cwd.

## Root Cause

`dist/bin/flowstate.js:18`:
```javascript
const cwd = process.cwd();
```

This is passed to every command. `taskDir(cwd, "pending")` resolves to
`${cwd}/.backlog/tasks/pending/`. When cwd is `apps/core/`, it looks for
`apps/core/.backlog/tasks/pending/` which doesn't exist — `listFiles()` returns `[]`.

## Affected Commands

All commands that take `cwd` — which is every single one: `task-list`, `task-update`,
`task-move`, `task-create`, `stats`, `index-rebuild`, `learning-search`, etc.

## Impact

- **Skill workflows break silently.** The `/flowstate:next-task` skill invokes `task-list`
  and gets `[]`, then tells the user there are no pending tasks — a false negative.
- **Data corruption risk.** If `task-create` runs from a subdirectory, it creates a new
  `.backlog/` tree in the wrong location. `task-update` would fail with `EntityNotFoundError`
  which at least surfaces, but `task-list` and `stats` just lie.
- **Hard to diagnose.** The agent (Claude) doesn't know its cwd shifted — tools like
  `pnpm --filter` change directory internally, and Bash tool state persists across calls.

## Suggested Fixes

1. **Walk up to find `.backlog/`** — like how git finds `.git/`. Replace `process.cwd()` with
   a function that walks parent directories until it finds `.backlog/` or hits filesystem root:
   ```typescript
   function findBacklogRoot(start: string): string {
     let dir = start;
     while (dir !== path.dirname(dir)) {
       if (fs.existsSync(path.join(dir, '.backlog'))) return dir;
       dir = path.dirname(dir);
     }
     throw new Error('No .backlog/ found in any parent directory');
   }
   ```

2. **Add `--cwd` flag** as an override for explicit control.

3. **Fail loudly** — if `.backlog/` doesn't exist at the resolved cwd, exit with a clear
   error message instead of returning empty results.

Option 1 + 3 together would eliminate this class of bugs entirely.

## Reproduction

```bash
cd /any/monorepo/with/.backlog
flowstate task-list --status pending --json true  # works
cd apps/some-app
flowstate task-list --status pending --json true  # returns [] silently
```
