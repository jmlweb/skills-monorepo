---
id: RPT-040
title: scan-secrets skips renamed and copied files, so a rename to .env or a secret added to a moved file passes
type: security
severity: high
status: triaged
created: 2026-11-25
triaged: 2026-11-25
task-id: TSK-095
---

## Where

`plugins/dev-workflow/src/core/git.ts:35`, `:47`, `:66` and `:80` pass `--diff-filter=AM` to every `git diff` that feeds `scan-secrets` (`plugins/dev-workflow/src/bin/dev-workflow.ts:77-78`).

## What happens

Git detects renames by default (`diff.renames` defaults to true), so a moved file shows status `R` (or `C` for a copy), not `A`. The `AM` filter drops those files from both the name list and the diff. Then neither the sensitive-filename check nor the content patterns see them.

## Reproduction

In a throwaway repo, commit `config.js` (8 lines) and `settings.txt`. Then:

```bash
git mv config.js app-config.js
echo 'const k = "sk_live_abcdefghijklmnop1234";' >> app-config.js
git mv settings.txt .env
git add -A
git diff --cached --name-status
node plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets; echo "exit $?"
```

Observed:

```
R100	settings.txt	.env
R053	config.js	app-config.js
No secrets detected in staged changes.
exit 0
```

If the same secret line is added in a new file (`other.js`), the scan reports `[secret-pattern] stripe live key — other.js:1` and exits 1.

## Expected

Renamed and copied files are scanned like added and modified ones. The filename check sees the new path (`.env`), and the content check sees the lines added in the rename. A likely fix is `--diff-filter=ACMR`, or `--no-renames`. Add a test for each case.

The same `getStagedFiles`/`getRangeFiles` helpers feed `detect-scope` and `detect-packages` (`dev-workflow.ts:93-94`, `:112`), so a commit that only renames files is invisible to scope detection as well.
