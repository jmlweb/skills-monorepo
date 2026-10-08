---
id: PLN-011
title: Add Spec axis to review-pr against task acceptance criteria
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-029
---

## Goal
Make `dev-workflow:review-pr` report two separate axes: Standards (repo rules + code-smell baseline) and Spec (does the diff do what the originating task asked), never merged or re-ranked.

## Context
Idea from mattpocock/skills `code-review`. Flowstate tasks already carry acceptance criteria, giving a free spec source. Today review-pr dispatches code-quality/security/QA/architecture agents with checklists in `skills/review-pr/assets/checklists.md`; none checks against intent.

## Approach
1. Step 2 (Fetch PR): add `body,commits` to the `gh pr view --json` field list; spec discovery needs both.
2. Spec source discovery, in order:
   1. Task/report ID (TSK-/RPT-) in branch name, PR title, PR body, or commit messages.
   2. Local task file under `.backlog/tasks/{pending,active,complete}/` (only if `.backlog/` exists — soft dependency, works without flowstate). The PR's branch may not be checked out, so the file may be absent locally.
   3. PR body or linked GitHub issue via `gh` (acceptance criteria / requirements section).
   4. None found → skip the Spec axis and note "no spec available" in the report.
3. Spec axis runs as a general-purpose subagent (no named persona fits); paste the brief and spec into its prompt, since subagents don't inherit skill context. Brief: (a) criteria missing or partial, (b) behaviour not asked for (scope creep), (c) criteria implemented wrongly; quote the criterion per finding; word cap.
4. Standards: new asset `assets/smells.md` with the Fowler smell baseline (Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest), each "what it is → how to fix". Rules: always a judgement call; documented repo standards override; skip what tooling enforces. Pasted into the code-reviewer prompt alongside its checklist section.
5. Report template: separate `## Standards` and `## Spec` sections, each with its own summary naming the worst finding within that axis. Remove the merged cross-axis re-ranking; no single winner across axes.
6. Update `plugins/dev-workflow/README.md` to describe the two axes; `pnpm bump minor` in `plugins/dev-workflow`; `claude plugin validate .` and `pnpm test` pass.

## Files to Modify
- `plugins/dev-workflow/skills/review-pr/SKILL.md` — `body,commits` fields, spec discovery step, Spec subagent dispatch
- `plugins/dev-workflow/skills/review-pr/assets/smells.md` — new: smell baseline
- `plugins/dev-workflow/skills/review-pr/assets/report-template.md` — per-axis sections and summaries, no merged re-ranking
- `plugins/dev-workflow/README.md` — describe axes
- `plugins/dev-workflow/{package.json,.claude-plugin/plugin.json}` + root `marketplace.json` — via `pnpm bump minor`

## Risks & Considerations
- Cross-plugin coupling: dev-workflow must work without flowstate installed.
- Task file may be missing locally when the PR branch isn't checked out; fallback chain covers it.
- Smell baseline may add noise; keep it explicitly advisory.
- SKILL.md body may exceed 150 lines; push detail into assets.

## Revision History
- [2026-10-08] Added `body,commits` to PR fetch; explicit spec fallback chain (task ID → local task file → PR body/issue → skip); smell baseline moved to new `assets/smells.md`; report template gets per-axis summaries with no merged re-ranking; Spec axis as general-purpose subagent; README update and `pnpm bump minor` added.
