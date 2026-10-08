---
id: TSK-029
title: Add Spec axis to review-pr against task acceptance criteria
status: active
priority: P2
tags: [dev-workflow, review-pr, spec]
created: 2026-10-08
source: plan/PLN-011
depends-on: [TSK-026]
started: 2026-10-08
---

# Add Spec axis to review-pr against task acceptance criteria

## Description

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



## Acceptance Criteria

- [ ] gh pr view fetch includes body,commits
- [ ] Spec discovery follows fallback chain: task/report ID → local task file → PR body or linked issue → skip with "no spec available"
- [ ] Spec general-purpose subagent reports missing/partial criteria, scope creep, and wrongly implemented criteria, quoting the criterion per finding
- [ ] assets/smells.md holds the 12-smell baseline with repo-override and judgement-call rules, pasted into the code-reviewer prompt
- [ ] Report template has separate Standards and Spec sections, worst finding per axis, no merged cross-axis re-ranking
- [ ] review-pr works with no .backlog/ present
- [ ] dev-workflow README describes the axes; plugin bumped via pnpm bump minor
- [ ] claude plugin validate . and pnpm test pass

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created
- [2026-10-08] Backlog check: sequenced after TSK-026. Both rewrite review-pr report-template.md; TSK-026 adds numbering and a severity filter, this task splits Standards and Spec. Keep the #N numbering global across both axes and apply the severity filter within each axis.
- [2026-10-08] Started