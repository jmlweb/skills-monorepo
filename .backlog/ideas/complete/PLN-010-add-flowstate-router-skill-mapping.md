---
id: PLN-010
title: Add flowstate router skill mapping the flows
status: approved
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
task-id: TSK-031
---

## Goal
One user-invoked skill (`flowstate:guide`) that maps flowstate's 18 commands into flows, so the user remembers one command instead of eighteen.

## Context
Idea from mattpocock/skills `ask-matt`: a router over user-invoked skills, organized as a main flow, on-ramps, maintenance, standalone. Pairs with the user-invoked split idea: the more skills leave the agent's reach, the more a human-facing map is needed.


## Approach
1. Name: `guide` (`help` collides with built-in `/help` when typed bare; `flows` is vague).
2. Map:
   - Main flow: `idea → review-idea → start-task → log-progress → complete-task` (approving an idea creates the task).
   - Direct entry: `add-task` (skips the idea step).
   - On-ramps: `report → triage-report`; `block-task` when stuck.
   - Maintenance: `condense-tasks`, `condense-learnings`, `check-task`, `overview`.
   - Parallel: `next-task → parallel`.
   - Knowledge: `add-learning`, `learnings`, `retro` (TSK-030).
   - Precondition: `setup`.
3. Split of jobs: `guide` holds flows, order, and "when to reach for it" branches for the human; the always-on `plugins/flowstate/SKILL.md` table (lines ~74-91) stays a flat command list for the model. No flat list duplicated in `guide`.
4. Body rule: read a skill's SKILL.md before claiming what it does (summaries are orientation only). Stateless: no CLI calls.
5. Frontmatter: `disable-model-invocation: true`, one-line human-facing description, `model: haiku`, `allowed-tools: Read`.
6. AGENTS.md rule: adding, renaming or removing a flowstate skill updates both `guide` and the `SKILL.md` table ("a router that lies is worse than none").
7. Add `guide` to the `SKILL.md` table and README; `pnpm bump minor`; `claude plugin validate .` and `pnpm test` pass.

## Files to Modify
- `plugins/flowstate/skills/guide/SKILL.md` — new
- `plugins/flowstate/SKILL.md` — command table entry
- `plugins/flowstate/README.md` — command table
- `AGENTS.md` — router-sync rule covering both places
- `plugins/flowstate/{package.json,.claude-plugin/plugin.json}` + root `marketplace.json` — via `pnpm bump minor`

## Risks & Considerations
- Sequence after TSK-028 (edits the same table, decides invocation modes) and TSK-030 (adds `retro`).
- Overlap with `overview` (state) vs `guide` (process): keep `guide` stateless.
- Two lists of commands (table + flows) can drift; the AGENTS.md sync rule is the guard.

## Revision History
- [2026-10-08] Named `guide`; fixed map (review-idea creates the task, add-task is a direct entry; added retro); split jobs between guide (flows) and SKILL.md table (flat list); sync rule covers both; SKILL.md table, version bump and tests added; sequencing risk after TSK-028/TSK-030.
