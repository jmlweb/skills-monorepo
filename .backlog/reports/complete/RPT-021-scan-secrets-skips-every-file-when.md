---
id: RPT-021
title: scan-secrets skips every file when git diff paths lack the b/ prefix
type: security
severity: high
status: triaged
created: 2026-11-01
triaged: 2026-11-01
task-id: TSK-069
---

## Summary
`scanDiff` in `plugins/dev-workflow/src/commands/scan-secrets.ts:84-87` only tracks a file when its `+++ ` header starts with `b/`; any other header sets `currentFile = ""`, and line 99 then skips every added line of that file. The diff comes from `getStagedDiff` / `getRangeDiff` (`plugins/dev-workflow/src/core/git.ts:30-38`, `:62-72`), which run `git diff` without `--src-prefix`/`--dst-prefix`/`--no-ext-diff`, so the header shape follows the user's git config and the path's characters. The open-pr skill relies on this scan as its secret gate, and it reports "No secrets detected" with exit 0.

Three cases miss secrets:
- `diff.noprefix=true`: header is `+++ app.js`
- `diff.mnemonicPrefix=true`: header is `+++ i/app.js`
- a non-ASCII path with the default `core.quotePath=true`: header is `+++ "b/caf\303\251.js"`

## Reproduction
```
D=$(mktemp -d) && cd $D && git init -q
printf 'const k = "AKIAABCDEFGHIJKLMNOP";\n' > app.js && git add app.js
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets   # finds aws access key, exit 1
git config diff.noprefix true
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets   # "No secrets detected in staged changes.", exit 0
git config --unset diff.noprefix; git config diff.mnemonicPrefix true
node <repo>/plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets   # "No secrets detected in staged changes.", exit 0
```
Same key in a file named `café.js` with default config: header `+++ "b/caf\303\251.js"`, output "No secrets detected in staged changes.", exit 0.

## Suggested fix
Pin the diff format in `git.ts`: pass `--src-prefix=a/ --dst-prefix=b/ --no-ext-diff` (or `-c core.quotePath=false` plus explicit prefixes) so the parser sees a stable header. Optionally make `scanDiff` decode quoted paths, and fall back to attributing a finding to `(unknown file)` rather than dropping it.
