---
id: LRN-064
title: A stub for an external CLI must mirror its global preconditions, not only the happy subcommands
status: active
tags: [testing, gh, hooks, stubs]
task: TSK-081
created: 2026-11-07
---

## Context
`scripts/gh-stub.mjs` stands in for `gh` in the store contract tests and the pre-commit hook tests. The hook test "silent when gh fails" first passed the wrong way: the stub only failed `auth status`, so `issue list` still answered from the state file.

## Insight
Real `gh` exits 4 with "please run: gh auth login" on every API subcommand when logged out; the stub now does the same for anything but `auth status`. Also: removing `gh` from PATH in a test must keep `node` reachable (`PATH=<empty>:<dirname(process.execPath)>`), or `spawnSync("node")` fails with status null and looks like a wrong exit code.

## Application
When stubbing an external CLI, encode its global preconditions (auth, repo) before its subcommands, and build "tool missing" PATHs from the node binary's own directory.
