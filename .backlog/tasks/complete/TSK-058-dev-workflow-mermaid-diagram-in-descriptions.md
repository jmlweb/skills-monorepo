---
id: TSK-058
title: dev-workflow: Mermaid diagram in descriptions of complex PRs
status: complete
priority: P3
tags: []
created: 2026-10-19
source: idea/PLN-029
depends-on: []
started: 2026-10-28
completed: 2026-10-28
---

# dev-workflow: Mermaid diagram in descriptions of complex PRs

## Description

The dev-workflow:pr-writer agent adds one Mermaid diagram to a PR description when the change is structurally complex (several interacting components, a new flow or state machine, a new cross-package dependency). Small, mechanical or single-area PRs get none. open-pr and pr-ready inherit it.

Approach: add a Diagrams section to pr-style-guide.md (when, where, shape, safe syntax); update self-check and "Things to leave out"; add a decision step with user veto to pr-writer.md; give hunk gathering in open-pr and pr-ready an explicit numeric cap; add one README line; lint, validate and sanity-run on a complex and a trivial branch. Release (minor bump) needs separate user confirmation. Full plan: .backlog/ideas/complete/PLN-029-dev-workflow-mermaid-diagram-in-descriptions.md

## Acceptance Criteria

- [x] pr-style-guide.md has a Diagrams section (when, where, shape, safe syntax)
- [x] Self-check and Things to leave out updated for diagrams
- [x] pr-writer.md decides on a diagram, with user-instruction veto
- [x] open-pr and pr-ready hunk gathering have an explicit numeric cap
- [x] dev-workflow README /open-pr section mentions the diagram
- [x] pnpm lint:skills and claude plugin validate . pass
- [x] Sanity run: complex branch gets a diagram that renders, trivial branch gets none

## Notes

## Learnings

- LRN-046: Check a Mermaid block renders locally with mmdc and system Chrome
## Progress Log

- [2026-10-19] Created
- [2026-10-28] Started
- [2026-10-28] criterion 1 — evidence: pnpm vitest run src/pr-writer.test.ts (style guide defines when, where, shape and safe syntax) → pass (2026-10-28)
- [2026-10-28] criterion 2 — evidence: pnpm vitest run src/pr-writer.test.ts (self-check and things to leave out cover diagrams) → pass (2026-10-28)
- [2026-10-28] criterion 3 — evidence: pnpm vitest run src/pr-writer.test.ts (agent decides on a diagram and honours a user veto) → pass (2026-10-28)
- [2026-10-28] criterion 4 — evidence: pnpm vitest run src/pr-writer.test.ts (open-pr and pr-ready share a cap of 5 files) → pass (2026-10-28)
- [2026-10-28] criterion 5 — evidence: pnpm vitest run src/pr-writer.test.ts (README /open-pr section mentions the diagram) → pass (2026-10-28)
- [2026-10-28] criterion 6 — evidence: pnpm lint:skills → 0 errors, 0 warnings; claude plugin validate . → Validation passed (2026-10-28)
- [2026-10-28] criterion 7 — evidence: pr-writer run on PR #6 feat/flowstate-kickstart inputs → one 9-node flowchart, rendered by mmdc 11.12.0 without error; on 6be928a deps bump → no diagram (2026-10-28)
- [2026-10-28] Completed