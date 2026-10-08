---
id: PLN-022
title: Require evidence for ticked acceptance criteria
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-040
---

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

## Files to Modify
- `plugins/flowstate/src/core/markdown.ts` — `tickCriteria` accepts an evidence map
- `plugins/flowstate/src/commands/task-update.ts` — evidence input and validation
- `plugins/flowstate/src/commands/task-move.ts` — unverified-criteria warning on complete
- `plugins/flowstate/src/bin/flowstate.ts` — `--evidence` flag parsing, help text, output of the warning
- `plugins/flowstate/src/commands/task-update.test.ts`, `plugins/flowstate/src/commands/task-move.test.ts`, `plugins/flowstate/src/commands/task-compress.test.ts` — new cases
- `plugins/flowstate/skills/log-progress/SKILL.md` — evidence per tick
- `plugins/flowstate/skills/check-task/SKILL.md` — line 95 tells the model to hand-edit `- [ ]`/`- [x]` lines in the task file; replace with `task-update --check --evidence` (CLI-owned file, and ticks need evidence)
- `plugins/flowstate/skills/complete-task/SKILL.md` — re-run evidence, claim/evidence table, reason for override
- `plugins/flowstate/README.md` — CLI flag docs
- `plugins/flowstate/dist/` — rebuilt by the pre-commit hook

## Risks & Considerations
- Re-running commands in `complete-task` can be slow (a full test suite). Re-run each distinct command once, not once per criterion.
- Evidence text is model-written and can still be wrong. The fresh re-run in `complete-task` is the real check; the suffix makes the claim auditable.
- Line length: long commands make criterion lines long. Cap the suffix (around 120 chars) in the CLI and truncate with an ellipsis.
- Overlaps TSK-029 (review-pr Spec axis reads the same criteria): the evidence suffix gives that axis more to read, with no conflict. TSK-032 (writing rules) will touch `complete-task`/`log-progress` prose, so sequence the audits after this lands or rebase on it.
- Changes `log-progress` and `complete-task` behaviour, both published skills; a minor bump covers it, and there are no renames.

## Open Questions
- Should `task-move --to complete` refuse (exit 1) when unverified criteria exist, behind a `--force` override? Recommendation: no, keep it a warning. A refusal changes exit-code meaning, which needs explicit approval.

## Revision History
- [2026-10-08] Added check-task: it hand-edits checkboxes today (SKILL.md:95), which bypasses the CLI and evidence; now ticks via task-update --check --evidence.
