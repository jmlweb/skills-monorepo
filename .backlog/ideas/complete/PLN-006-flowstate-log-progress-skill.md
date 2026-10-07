---
id: PLN-006
title: flowstate: log-progress skill
status: approved
created: 2026-10-07
complexity: medium
reviewed: 2026-10-07
task-id: TSK-022
---

## Goal

Give users a one-step way to record session progress on a task, including ticking acceptance criteria, without hand-editing CLI-owned task files.

## Context

- `task-update <id> --log <msg>` already appends a dated entry, but no skill exposes it. Users either skip logging or hand-edit the file.
- Ticking acceptance criteria has no CLI support. TSK-016 criteria 1-2 were ticked by hand (commit 6e2be9d), which breaks the "CLI owns entity files" rule.
- `appendToBody` (`core/markdown.ts`) appends to the end of the body. That works only because `## Progress Log` is currently the last section. It breaks silently if the template gains a later section or a user adds one.
- Supports resuming after `/clear`: the Progress Log becomes a reliable "where was I" record.

## Approach

1. Make `--log` section-aware by reusing the existing helpers in `core/markdown.ts`: if `hasSection(body, "Progress Log")` is false, throw a typed error (LRN-001: no silent fallback). Otherwise insert with `appendToSection(body, "Progress Log", entry)` instead of `appendToBody`.
2. Add `--check <n[,n...]>` to `task-update`: tick acceptance criteria by 1-based index within `## Acceptance Criteria`, through a new pure `tickCriteria(body, indexes)` helper in `core/markdown.ts`. Reject out-of-range indexes with an actionable error. Already-ticked criteria are a no-op, so the flag is idempotent.
3. Accept `--log -` to read the message from stdin. Reading happens in `bin/flowstate.ts` through the existing private `readStdin()`, so the command module stays pure. Each non-empty line becomes its own dated bullet.
4. Tests:
   - `core/markdown.test.ts`: `tickCriteria` (by index, out-of-range, idempotent, leaves other sections untouched) and `appendToSection` with a stray `##` heading inside Progress Log (pin current behavior).
   - `commands/task-update.test.ts`, on real temp dirs: section-aware insert, missing section error, `--check`, multi-line log.
5. New skill `skills/log-progress/SKILL.md` (`model: haiku`, no effort, `allowed-tools: Bash(node:*), Read`):
   - Resolve the task: explicit ID argument, else the single active task, else ask.
   - Re-read the task file right before writing, so criteria indexes are current.
   - Draft 1-3 lines from the session (what changed, what's next). Show them and the criteria it proposes to tick. Apply only after confirmation.
   - Call `task-update <id> --log - --check ...`.
   - If the session surfaced something non-obvious, offer `/flowstate:add-learning`. Never create it automatically.
6. `complete-task`: in the unchecked-criteria warning, add a line pointing to `/flowstate:log-progress` for ticking criteria that are already done.
7. Update the `SKILL.md` CLI table, the `task-update` help text, and the README command table. `pnpm typecheck && pnpm test`, then `claude plugin validate .`.

## Files to Modify

- `plugins/flowstate/src/core/markdown.ts`: new `tickCriteria` helper (reuse `hasSection` / `appendToSection` as-is)
- `plugins/flowstate/src/core/markdown.test.ts`: `tickCriteria` cases, `appendToSection` edge case
- `plugins/flowstate/src/commands/task-update.ts`: `check` input, section-aware log
- `plugins/flowstate/src/commands/task-update.test.ts`: new cases
- `plugins/flowstate/src/bin/flowstate.ts`: parse `--check`, `--log -` via `readStdin()`, help text
- `plugins/flowstate/skills/log-progress/SKILL.md`: new skill
- `plugins/flowstate/skills/complete-task/SKILL.md`: pointer in the unchecked-criteria warning
- `plugins/flowstate/SKILL.md`: CLI table
- `plugins/flowstate/README.md`: command table
- `plugins/flowstate/dist/**`: rebuilt by the pre-commit hook

## Risks & Considerations

- Section-aware `--log` changes behavior for task files without a `## Progress Log` section (they used to get a bare append). No skill calls `--log` today, so the exposure is direct CLI users only. Verify with `rg -L '## Progress Log' .backlog/tasks` before shipping.
- `appendToSection` ends a section at the next `#` or `##` heading. A stray heading inside Progress Log puts the entry above it. The test pins this behavior.
- Criteria by index is fragile if the list is edited mid-session. The skill re-reads the task right before calling the CLI.
- Trigger phrases ("log progress", "save where I am", "wrap up session", "note progress on TSK-…") must not collide with `complete-task` ("done with task"). State the when-not-to-use in the description.

## Open Questions

- Should the `log-progress` skill also run automatically at session end via a hook? Default: no. Keep it manual and add a hook later if wanted.

## Revision History

- [2026-10-07] Reuse the existing `hasSection` / `appendToSection` helpers instead of a new append helper. stdin reading stays in `bin/flowstate.ts` via `readStdin()`. Added `markdown.test.ts` cases, a re-read step before writing, and a `complete-task` pointer to `log-progress`.
