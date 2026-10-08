---
id: TSK-040
title: Require evidence for ticked acceptance criteria
status: pending
priority: P2
tags: [flowstate, cli, acceptance-criteria]
created: 2026-10-08
source: plan/PLN-022
depends-on: []
---

# Require evidence for ticked acceptance criteria

## Description

## Goal
Make a ticked acceptance criterion carry the proof that it was met (the command run and its result), and have `complete-task` check that proof instead of trusting checkbox state.

## Context
Source: the review of agent-skill repos (2026-10-08). Three repos converge on "evidence over assertion":
- obra/superpowers `skills/verification-before-completion/SKILL.md`: before claiming done, identify the command, run it in full, read the output and exit code, verify, then claim. It includes a claim / requires / not-sufficient table and banned hedges ("should", "probably").
- obra/superpowers `skills/executing-plans/scripts/task-done`: records completion only when the task's test command exits 0.
- addyosmani/agent-skills `references/definition-of-done.md` ("seems right is never sufficient").
- addyosmani/agent-skills `skills/constraint-driven-development/SKILL.md`: every constraint row must name the command that produces its verdict ("a number with no command is an aspiration").
- affaan-m/ECC `docs/ROADMAP.md`: gate receipts, not prose claims.

Today `log-progress` ticks criteria the session "clearly satisfied". `task-update --check N` flips `- [ ]` to `- [x]` with no record of why. `complete-task` step 2 checks only checkbox state and offers "Mark as complete anyway". So a `[x]` can be wrong and nothing shows it, and the user has to re-verify by hand.

Constraints found in the code:
- `tickCriteria` in `src/core/markdown.ts` addresses criteria by position (`CRITERION_PATTERN = /^- \[[ xX]\] /`).
- `task-compress` protects the `Acceptance Criteria` section (`PROTECTED_SECTIONS`), but `condense-tasks` prunes middle Progress Log entries. So evidence must live on the criterion line, not in the log.
- `task-create` already takes a JSON flag (`--criteria '[...]'`, parsed with `JSON.parse`), which gives a precedent for structured input without a parser change.

## Approach
1. Evidence format: an inline suffix on the ticked line, `- [x] <criterion> — evidence: <command or check> → <result> (<date>)`. It stays in the protected section, survives compression, and is visible in the file.
2. CLI `task-update`: add `--evidence '{"2":"pnpm test → exit 0"}'` (JSON object keyed by criterion number, same style as `--criteria`). Every key must also be in `--check`; a key outside `--check` is an `InvalidArgumentError`. `tickCriteria` gains an optional evidence map and appends the suffix. Ticking without evidence stays allowed, for backwards compatibility and for criteria with nothing to run (docs wording, a decision recorded).
3. CLI `task-move --to complete`: report ticked criteria that have no evidence as a warning line in plain and `--json true` output (`unverifiedCriteria: [n…]`). Exit code stays 0, so existing exit-code meanings are untouched.
4. `log-progress`: for each criterion it proposes to tick, name the evidence (the command run this session and its result, or "manual: <what was checked>"), show it in the confirm block, and pass `--evidence`. A criterion with no evidence available is left unticked.
5. `complete-task` step 2: list ticked criteria with their evidence. Re-run each command-type evidence fresh (tests, typecheck, build, lint) and show the result. Flag criteria that have no evidence or whose re-run now fails. "Mark as complete anyway" stays, but asks for a one-line reason that is logged via `task-update --log`. Add a short claim → required-evidence table (tests pass → test command output with exit 0; built → build exit 0; docs updated → file and section named).
6. `check-task`: when it finds criteria met in the code, tick them via `task-update --check N --evidence '{…}'` with the file/test that proves it, instead of hand-editing checkboxes.
7. Tests: `task-update.test.ts` (suffix written, key-outside-check rejected, bad JSON rejected), `task-move.test.ts` (unverified list in output), and a `task-compress` test that the suffix survives. All use temp-dir sandboxes asserting on file content.
8. README CLI flags table: document `--evidence`. Run `pnpm build`, `pnpm test`, `claude plugin validate .`, and `pnpm bump minor` in `plugins/flowstate`.



## Acceptance Criteria

- [ ] task-update --evidence JSON writes an inline evidence suffix on ticked criteria; keys outside --check and bad JSON rejected with typed errors
- [ ] task-move --to complete reports ticked criteria without evidence in plain and --json output; exit code unchanged
- [ ] Evidence suffix survives task-compress (test)
- [ ] log-progress passes evidence per tick; complete-task re-runs command evidence and logs a reason for overrides
- [ ] check-task ticks via task-update --check --evidence instead of hand-editing checkboxes
- [ ] README CLI flags documented; pnpm typecheck, pnpm test, claude plugin validate . pass; flowstate bumped minor via pnpm bump

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created