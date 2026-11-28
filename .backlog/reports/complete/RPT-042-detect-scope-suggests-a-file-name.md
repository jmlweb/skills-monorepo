---
id: RPT-042
title: detect-scope suggests a file name as scope for files directly under apps/, packages/ or plugins/
type: bug
severity: medium
status: triaged
created: 2026-11-28
triaged: 2026-11-28
task-id: TSK-097
---

## Observed

`plugins/dev-workflow/src/commands/detect-scope.ts:54-55` splits each staged path on `/` and only skips paths with fewer than 2 parts. A file sitting directly in a workspace dir (`apps/README.md`, `packages/tsconfig.json`) has exactly 2 parts, so its *file name* becomes the scope (line 64-66: `top === "apps" || top === "plugins" ? name : readPackageName(...) ?? name`).

`shared/commit-basics.md` tells the commit and changeset skills to use `suggested` verbatim, so the commit becomes `docs(README.md): ...`.

## Reproduction

```bash
cd "$(mktemp -d)" && git init -q && git checkout -q -b feat/login
git -c user.email=a@b -c user.name=a commit -q --allow-empty -m init
mkdir -p apps packages/ui
echo '{"name":"@x/ui"}' > packages/ui/package.json
echo hi > apps/README.md; echo x > packages/tsconfig.json
git add apps/README.md
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js detect-scope
# prints: README.md   (expected: no file-derived scope; fall back to branch -> "login")
git add -A
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js detect-scope --json true
# "scopes": ["README.md", "tsconfig.json", "ui"], "suggested": null
```

`detect-packages` on the same tree correctly lists only `packages/ui`.

## Expected

Only paths with at least 3 segments (`<workspace>/<package>/<file>`) yield a scope; a file directly under a workspace dir is ignored like a root file.
