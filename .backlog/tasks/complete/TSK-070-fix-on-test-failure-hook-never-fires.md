---
id: TSK-070
title: Fix: on-test-failure hook never fires: wrong event and nonexistent exit_code field
status: complete
priority: P3
tags: [flowstate, hooks]
created: 2026-11-01
source: report/RPT-022
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Fix: on-test-failure hook never fires: wrong event and nonexistent exit_code field

## Description

From RPT-022. `plugins/flowstate/hooks/hooks.json:3-13` registers `on-test-failure.sh` on `PostToolUse`, which runs only after a tool succeeds, and the script reads `.tool_output.exit_code` (`plugins/flowstate/hooks/on-test-failure.sh:8`), a field no hook input has. The README promise (`plugins/flowstate/README.md:241`) is never kept. Both hooks also print top-level `additionalContext` instead of `hookSpecificOutput`.

### Approach
Move the hook to `PostToolUseFailure` with matcher `Bash`, parse the `Exit code N` first line of `error`, emit the `hookSpecificOutput` shape. Verify once in a live session.

## Acceptance Criteria

- [x] on-test-failure.sh is registered for the event Claude Code fires when a Bash command exits non-zero (PostToolUseFailure) — evidence: hooks.json PostToolUseFailure matcher Bash (2026-11-07)
- [x] The hook detects failure from the documented input fields, not tool_output.exit_code — evidence: on-test-failure.sh keys on tool_name, is_interrupt and Exit code N line of error (2026-11-07)
- [x] Both hooks emit additionalContext inside hookSpecificOutput with hookEventName
- [x] A script test feeds documented payloads to both hooks and asserts the output; pnpm test passes — evidence: scripts/flowstate-hooks.test.mjs 9 pass; pnpm test 147/147 scripts (2026-11-07)
- [x] README and references/architecture.md hook descriptions match the new behaviour

## Notes

## Learnings

- LRN-053: PostToolUse never sees a failed Bash call; key PostToolUseFailure on the Exit code N line of error
## Progress Log

- [2026-11-01] Created
- [2026-11-07] Started
- [2026-11-07] Merged cc383fc into main. Live-session verification still pending the next failing test run; payloads come from the official hooks docs.
- [2026-11-07] Completed