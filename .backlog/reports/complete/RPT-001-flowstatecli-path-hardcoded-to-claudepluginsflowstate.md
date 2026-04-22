---
id: RPT-001
title: FLOWSTATE_CLI path hardcoded to ~/.claude/plugins/flowstate/
type: bug
severity: high
status: triaged
created: 2026-04-05
triaged: 2026-04-05
---

All SKILL.md files hardcoded the CLI path as ~/.claude/plugins/flowstate/dist/bin/flowstate.js instead of using ${CLAUDE_PLUGIN_ROOT}. This broke installation via submodule, marketplace, or any non-default location.

## Impact

- Plugin only worked when cloned to ~/.claude/plugins/flowstate/
- Submodule installation (documented in README) was broken
- Marketplace distribution would have been broken

## Fix

Replaced all 17 occurrences across 15 files with ${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js
