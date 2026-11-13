---
id: RPT-031
title: scan-secrets misses fine-grained GitHub tokens (github_pat_)
type: security
severity: medium
status: triaged
created: 2026-11-13
triaged: 2026-11-13
task-id: TSK-086
---

## What happens

`dev-workflow scan-secrets` flags classic GitHub tokens (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`) but not fine-grained personal access tokens, which start with `github_pat_`. GitHub now recommends fine-grained tokens, so the most common modern token type passes the pre-commit scan that `/commit`, `/changeset` and `/open-pr` rely on.

Cause: the only GitHub pattern is `/\bgh[pousr]_[A-Za-z0-9]{36,}\b/` at `plugins/dev-workflow/src/commands/scan-secrets.ts:42`. No pattern matches `github_pat_<22 chars>_<59 chars>`.

## Reproduction

In an empty git repo, stage one file with a fine-grained token and one with a classic token, then scan:

```
P="github_pat_11ABCDEFG0$(printf 'a%.0s' {1..72})"; echo "const token = \"$P\";" > config.ts
C="ghp_$(printf 'b%.0s' {1..36})"; echo "const classic = \"$C\";" > classic.ts
git add . && node plugins/dev-workflow/dist/bin/dev-workflow.js scan-secrets
```

Observed output (exit 1, only the classic token):

```
Found 1 potential secret(s) in staged changes:

  [secret-pattern] github token — classic.ts:1
  const classic = "ghp_…bb";
```

`config.ts:1` holds a `github_pat_` token and is not reported.

## Expected

`config.ts:1` is reported as a GitHub token too, with a test in `scan-secrets.test.ts`.
