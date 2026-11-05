---
id: LRN-048
title: Pin git diff output before parsing it: user config rewrites headers and paths
status: active
tags: [dev-workflow, git, scan-secrets]
task: TSK-069
created: 2026-11-05
---

Parsing `git diff` output inherits the user's git config, and several keys silently change what a parser sees:

- `diff.noprefix` drops the `a/`/`b/` prefixes; `diff.mnemonicPrefix` swaps them for `i/`, `w/`, `c/` — but only for index/worktree diffs, a commit-to-commit range still prints `a/`/`b/`.
- `core.quotePath` (default true) octal-escapes non-ASCII names as `"b/caf\303\251.ts"`, in `--name-only` too. `-c core.quotePath=false` must come before the subcommand, and git still C-quotes paths containing `"`, `\` or control characters.
- `diff.external` replaces the unified diff entirely; `--no-ext-diff` turns it off.
- An unquoted path containing a space gets a trailing TAB on its `---`/`+++` header line.

Fix used in dev-workflow `core/git.ts`: `-c core.quotePath=false` on every call plus `--src-prefix=a/ --dst-prefix=b/ --no-ext-diff` on diff calls; the parser still unquotes C-quoted paths and never drops lines under an unrecognized header.
