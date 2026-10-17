---
id: PLN-028
title: flowstate kickstart skill: description to evaluated, documented, tasked project
status: approved
created: 2026-10-17
complexity: high
reviewed: 2026-10-17
task-id: TSK-052
---

## Goal

Add a user-invoked `/flowstate:kickstart` skill that takes a project description and, in five gated phases, produces an evaluated idea, architecture decisions, starter docs and rules, an independent review, and a first set of backlog tasks in the target project.

## Context

Starting a new project today means running several skills by hand (`setup`, then `idea`/`add-task`) with no step that questions whether the project is worth building or records its founding decisions. The user wants one command that:

1. Understands the description (grilling rounds).
2. Evaluates it honestly: feasible yes/no and why; real need vs established competitors (find a gap or say there is none); explicit goal (money / community / portfolio / learning).
3. Initializes the project: ADRs at capability level (e.g. "real-time channel", never "socket.io"), initial docs, rules, and proposed project skills.
4. Has a second agent review ADRs, docs and rules.
5. Guides the user to define the initial tasks.

Worked example and test fixture (not planned here): a temperature tower G-code generator for PrusaSlicer users. The user downloads an STL, slices it with their material profile, and the tool rewrites temperatures per band, taking its defaults from the sliced G-code. Prior art: garethky's PrusaSlicerPressureAdvanceCalibration. OrcaSlicer already ships a native generator, which is exactly the kind of fact the evaluation phase must surface.

Decisions agreed with the user:
- Lives in flowstate, because phase 5 needs its CLI. User-invoked (`disable-model-invocation: true`), `model: sonnet`, `effort: high`. `kickstart` avoids the reserved `plan`, `init` and `setup`.
- Runs in the target project's cwd. If no backlog exists, it creates one through the CLI `setup` command, not the `/flowstate:setup` skill: house rule, no skill calls a user-invoked skill.
- Evaluation is advisory: it stops only on "infeasible". A weak market gap is stated plainly, but a portfolio or learning goal is a valid reason to proceed. The goal must be fixed before any ADR.
- The market check uses WebSearch, names alternatives with source links, and marks unverified claims as unverified.
- The skill pauses for user approval after evaluation, after the ADR/docs draft, and after the review.
- The reviewer is a new read-only plugin agent, `flowstate:kickstart-reviewer`, which is flowstate's first agent. The skill owns all writes, with at most one review-and-fix loop.
- Tasks are a walking skeleton, proposed in rounds with `depends-on` links and created via `task-create`.

## Approach

1. Write `plugins/flowstate/shared/kickstart-templates.md` with the ADR template, the `AGENTS.md` skeleton and the `docs/overview.md` skeleton. The ADR template includes a hard rule: name a mechanism class, never a product, library or framework.
2. Write `plugins/flowstate/agents/kickstart-reviewer.md` (`tools: Read`, `model: sonnet`, `effort: high`). Given the paths of the generated files, it returns findings: ADRs naming products, decisions that contradict the stated goal or constraints, docs or rules that disagree with the ADRs, `AGENTS.md` rules that are vague or untestable. It returns text only.
3. Write `plugins/flowstate/skills/kickstart/SKILL.md` (≤150 lines; `allowed-tools`: Read, Write, Edit, WebSearch, Agent, `Bash(node:*)`, plus `Bash(ln:*)` for the `CLAUDE.md` symlink). Workflow steps:
   1. Prerequisites: resolve the backlog, or create it with the CLI `setup` command.
   2. Grilling: rounds per `shared/grilling.md` until goal, users, scope and constraints are known.
   3. Evaluate: feasibility verdict, WebSearch market scan with links, gap/differentiator or a frank "no gap", and the goal fixed. Checkpoint.
   4. Initialize: write `docs/adr/NNNN-*.md`, `AGENTS.md` with `CLAUDE.md` symlinked to it, `docs/overview.md`, and project-local skill proposals that are written to `.claude/skills/` only on approval. Checkpoint.
   5. Review: spawn `flowstate:kickstart-reviewer`, apply the accepted fixes, run at most one re-review. Checkpoint.
   6. Tasks: propose a walking-skeleton list in rounds, then `task-create` each task, passing `depends-on` links.
   7. Confirmation block listing the files written and the task IDs.
4. Register it: add a row to the README command table, add it to `skills/guide/SKILL.md` and the root `SKILL.md` router, and update the routing eval fixtures if user-invoked skills appear there (LRN-018).
5. Write a sandbox harness, `scripts/sandbox-kickstart.mjs` plus a `pnpm sandbox:kickstart` script, that runs the skill on a throwaway repo with the temperature tower brief. It checks invariants: ADR files exist, no ADR names a library from a deny-list sample, `CLAUDE.md` is a symlink, and tasks exist in the backlog.
6. Validate: run `pnpm lint:skills`, `claude plugin validate .` and `claude plugin validate plugins/flowstate` (LRN-009), then bump flowstate (minor).

## Files to Modify

- `plugins/flowstate/skills/kickstart/SKILL.md` — new skill
- `plugins/flowstate/agents/kickstart-reviewer.md` — new read-only reviewer agent (first flowstate agent; no `agents` key in `plugin.json`)
- `plugins/flowstate/shared/kickstart-templates.md` — new ADR, `AGENTS.md` and overview templates
- `plugins/flowstate/README.md` — command table row, plus a flow diagram entry
- `plugins/flowstate/skills/guide/SKILL.md` — route to kickstart
- `plugins/flowstate/SKILL.md` — command table row
- `plugins/flowstate/evals/` — routing fixtures, only if they enumerate user-invoked skills
- `scripts/sandbox-kickstart.mjs` and root `package.json` — live sandbox harness and script
- `GLOSSARY.md` — define "ADR" if skill prose uses the term as repo vocabulary

## Risks & Considerations

- **Length.** Five phases in ≤150 lines needs progressive disclosure: templates and evaluation rubrics go in `shared/`, and the body keeps only the steps and their done conditions.
- **Honesty drift.** A model tends to validate the user's idea. The evaluation step needs positive-phrased rules: cite a source for every competitor claim, state the verdict before the reasons, and treat "no gap" as an allowed outcome.
- **ADR altitude.** Models slide into naming libraries. That is enforced twice, by the template rule and by the reviewer check, and the sandbox deny-list catches regressions.
- **Writing outside the backlog.** This is the first flowstate skill to write project files (`docs/`, `AGENTS.md`, `.claude/skills/`). It must never overwrite existing files: if a target exists, show a diff and ask.
- **Symlink portability.** `CLAUDE.md` as a symlink fails on some Windows checkouts. Fall back to a one-line `CLAUDE.md` that points at `AGENTS.md`.
- **Reviewer independence.** The agent sees only the files and the goal statement, not the conversation, so its review is not anchored on the drafting reasoning (LRN-003: it must be an agent, not a skill).
- **Scope creep.** Tasks stop at a walking skeleton. A roadmap is out of scope.
- **WebSearch availability.** If the tool is unavailable or denied, the market check degrades to "unverified: user to confirm", and the skill does not invent competitors.

## Open Questions

- Should the ADR numbering and format follow an established convention (e.g. MADR-lite: Context / Decision / Consequences), or a lighter house format? Default: Context / Decision / Consequences / Status.
- Should the evaluation verdict also be saved, as `docs/evaluation.md`, so the honest assessment survives the session? Default: yes.
