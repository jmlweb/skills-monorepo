---
id: LRN-060
title: Probe a plugin hook end to end with a nested claude -p --plugin-dir in a scratch repo
status: active
tags: [claude-code, hooks, testing, plugins]
task: TSK-079
created: 2026-11-07
---

## Context
TSK-079 needed proof that the compiled read-only zones hook blocks under Claude Code, not only under vitest. Hook stdin fields and exit-2 semantics live only on the official hooks page (fetched in 100k offsets), not in `references/plugin-docs.md`; `notebook_path` for NotebookEdit is on the permissions page.

## Insight
`claude -p "<prompt>" --plugin-dir plugins/<name> --allowedTools Write --model haiku < /dev/null` in a scratch dir holding a bare `.git/` directory loads `hooks/hooks.json` from source and reports the block reason verbatim. `CLAUDE_PROJECT_DIR` is set automatically to the scratch cwd. One haiku call, about 20 seconds.

## Application
Use this as the live-run step for any new plugin hook. Exit 2 stderr becomes the deny reason Claude sees; stderr on exit 0 is never shown.
