---
id: TSK-070
title: Fix: on-test-failure hook never fires: wrong event and nonexistent exit_code field
status: pending
priority: P3
tags: []
created: 2026-11-01
source: report/RPT-022
depends-on: []
---

# Fix: on-test-failure hook never fires: wrong event and nonexistent exit_code field

## Description

### Description
From RPT-022. `plugins/flowstate/hooks/hooks.json:3-13` registers `on-test-failure.sh` on `PostToolUse`, which runs only after a tool succeeds, and the script reads `.tool_output.exit_code` (`plugins/flowstate/hooks/on-test-failure.sh:8`), a field no hook input has. The README promise (`plugins/flowstate/README.md:241`) is never kept. Both hooks also print top-level `additionalContext` instead of `hookSpecificOutput`.

### Approach
Move the hook to `PostToolUseFailure` with matcher `Bash`, parse the `Exit code N` first line of `error`, emit the `hookSpecificOutput` shape. Verify once in a live session.

## Acceptance Criteria

- [ ] on-test-failure.sh is registered for the event Claude Code fires when a Bash command exits non-zero (PostToolUseFailure)
- [ ] The hook detects failure from the documented input fields, not tool_output.exit_code
- [ ] Both hooks emit additionalContext inside hookSpecificOutput with hookEventName
- [ ] A script test feeds documented payloads to both hooks and asserts the output; pnpm test passes
- [ ] README and references/architecture.md hook descriptions match the new behaviour

## Notes

## Learnings

## Progress Log

- [2026-11-01] Created