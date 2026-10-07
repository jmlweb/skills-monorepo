---
id: TSK-022
title: flowstate: log-progress skill
status: pending
priority: P2
tags: [flowstate, cli, skill, progress-log]
created: 2026-10-07
source: plan/PLN-006
depends-on: []
---

# flowstate: log-progress skill

## Description

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



## Acceptance Criteria

- [ ] task-update --log inserts into ## Progress Log via hasSection/appendToSection; missing section throws a typed error
- [ ] task-update --check <n,...> ticks acceptance criteria by 1-based index via tickCriteria; out-of-range rejected; idempotent
- [ ] --log - reads stdin in bin/flowstate.ts; each non-empty line becomes a dated bullet
- [ ] markdown.test.ts and task-update.test.ts cover the new behavior on real temp dirs
- [ ] skills/log-progress/SKILL.md (haiku): resolves task, re-reads it, drafts 1-3 lines, confirms, calls the CLI, offers add-learning
- [ ] complete-task unchecked-criteria warning points to /flowstate:log-progress
- [ ] SKILL.md CLI table, task-update help text and README command table updated
- [ ] pnpm typecheck, pnpm test and claude plugin validate . pass

## Notes

## Learnings

## Progress Log

- [2026-10-07] Created