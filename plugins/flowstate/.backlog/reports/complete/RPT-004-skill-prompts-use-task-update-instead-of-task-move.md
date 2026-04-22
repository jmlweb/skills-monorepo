---
id: RPT-004
title: "Skill prompts use task-update to change status instead of task-move"
type: bug
severity: medium
status: triaged
created: 2026-04-10
triaged: 2026-04-10
task-id: TSK-009
---

## Summary

The skill prompt for `/flowstate:next-task` (and likely `/flowstate:start-task` and
`/flowstate:complete-task`) instructs the agent to use `task-update --set status=active`
to change task status. This only updates the frontmatter — it does NOT move the file
between directories (`pending/` → `active/` → `complete/`) and does NOT rebuild the index.

The correct command is `task-move <id> --to active`, which:
1. Moves the file to the correct directory
2. Updates frontmatter (status, started/completed dates)
3. Appends a progress log entry
4. Rebuilds `tasks/index.md`

## Observed Behavior

```
# What the skill prompt tells the agent to do:
flowstate task-update TSK-044 --set status=active
# Result: frontmatter updated, file stays in pending/, index not rebuilt

# What should happen:
flowstate task-move TSK-044 --to active
# Result: file moved to active/, frontmatter updated, index rebuilt
```

After `task-update`, the task is in a broken state:
- File is physically in `tasks/pending/` but frontmatter says `status: active`
- `task-list --status pending` returns it (scans directory, ignores frontmatter status)
- `task-list --status active` does NOT return it (scans `active/` directory, file isn't there)
- `index.md` is stale — still shows old counts

## Root Cause

The skill prompt templates were written assuming `task-update --set status=X` would handle
the full lifecycle. But `task-update` is a metadata-only command — it's designed for updating
fields like priority, tags, or blocked-by. Status transitions should use `task-move`.

### Code comparison

**`task-update.js`** (lines 20-31):
- Reads file, updates frontmatter keys, writes back to **same path**
- No directory move, no index rebuild, no date stamping

**`task-move.js`** (lines 13-60):
- Reads file, updates frontmatter (status + started/completed dates)
- Moves file from source dir to target dir via `moveFile()`
- Appends progress log entry ("Started", "Completed", etc.)
- Calls `indexRebuild(cwd, "tasks")` to sync the index

## Affected Skills

Likely all skills that transition task status. At minimum:
- `/flowstate:next-task` — step 5 "Handle Response" says to "Move the task to active"
  but doesn't specify which CLI command. The agent defaults to `task-update`.
- `/flowstate:start-task` — probably has the same issue
- `/flowstate:complete-task` — probably has the same issue

## Suggested Fixes

1. **Skill prompts should explicitly use `task-move`** for status transitions:
   ```
   flowstate task-move TSK-044 --to active    # start
   flowstate task-move TSK-044 --to complete  # complete
   ```

2. **Consider making `task-update --set status=X` delegate to `task-move`** — if the
   updated key is `status`, automatically trigger the move+index workflow. This would
   make the API less error-prone since the distinction between "update metadata" and
   "transition status" is not obvious.

3. Alternatively, **`task-update` should reject `status` as a key** with an error message
   pointing to `task-move`.
