---
id: RPT-027
title: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root
type: bug
severity: high
status: triaged
created: 2026-11-08
triaged: 2026-11-08
task-id: TSK-082
---

## Observed

When the edited file sits inside a nested git repository under the project (a submodule, or any subdirectory with its own `.git`), the dev-workflow read-only-zones hook matches the path relative to that nested root instead of the project root. A zone that covers the nested directory never matches, so the edit is allowed; a root-level zone such as `dist/**` matches the nested repo's own `dist/` and blocks it by mistake.

The README says globs "match the whole path relative to the repository root" (`plugins/dev-workflow/README.md:402`).

## Location

- `plugins/dev-workflow/src/core/read-only-zones.ts:195` — `findGitRoot(dirname(target))` stops at the nearest `.git` entry, which for a submodule is the submodule's `.git` file
- `plugins/dev-workflow/src/core/read-only-zones.ts:183` — `isInside(projectDir, gitRoot)` accepts any root under the project, so the nested repo becomes the match root
- `plugins/dev-workflow/src/core/read-only-zones.ts:130` — `findGitRoot` treats a `.git` file as a linked worktree only; a submodule's `.git` file (`gitdir: ../../.git/modules/...`) takes the same path

## Reproduction

Built hook from main (`plugins/dev-workflow/dist/bin/read-only-zones-hook.js`):

```
D=$(mktemp -d); cd $D && git init -q && mkdir -p .claude vendor/lib/dist dist
echo '[{"glob":"vendor/lib/**","why":"vendored"},{"glob":"dist/**","why":"build output"}]' > .claude/read-only-zones.json
(cd vendor/lib && git init -q)
for f in vendor/lib/dist/a.js vendor/lib/x.js dist/a.js; do
  echo "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$D/$f\"},\"cwd\":\"$D\"}" \
    | CLAUDE_PROJECT_DIR=$D node <repo>/plugins/dev-workflow/dist/bin/read-only-zones-hook.js; echo "$f -> exit $?"
done
```

Observed:

```
read-only zone: dist/a.js matches "dist/**" ...
vendor/lib/dist/a.js -> exit 2     # wrong: blocked by the root dist/** zone
vendor/lib/x.js -> exit 0          # wrong: vendor/lib/** zone bypassed
dist/a.js -> exit 2                # correct
```

Expected: `vendor/lib/x.js` and `vendor/lib/dist/a.js` both blocked by `vendor/lib/**`, reported as `vendor/lib/...`.

## Suggested fix

Keep walking up while the found root is strictly inside the project dir and is not a linked worktree of the project; use the outermost root at or above the project (or the project dir itself). Add a test with a nested repo and with a submodule-style `.git` file pointing into `.git/modules/`.
