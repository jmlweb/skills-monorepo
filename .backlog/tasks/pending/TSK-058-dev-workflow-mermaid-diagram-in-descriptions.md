---
id: TSK-058
title: dev-workflow: Mermaid diagram in descriptions of complex PRs
status: pending
priority: P3
tags: []
created: 2026-10-19
source: idea/PLN-029
depends-on: []
---

# dev-workflow: Mermaid diagram in descriptions of complex PRs

## Description

The dev-workflow:pr-writer agent adds one Mermaid diagram to a PR description when the change is structurally complex (several interacting components, a new flow or state machine, a new cross-package dependency). Small, mechanical or single-area PRs get none. open-pr and pr-ready inherit it.

Approach: add a Diagrams section to pr-style-guide.md (when, where, shape, safe syntax); update self-check and "Things to leave out"; add a decision step with user veto to pr-writer.md; give hunk gathering in open-pr and pr-ready an explicit numeric cap; add one README line; lint, validate and sanity-run on a complex and a trivial branch. Release (minor bump) needs separate user confirmation. Full plan: .backlog/ideas/complete/PLN-029-dev-workflow-mermaid-diagram-in-descriptions.md

## Acceptance Criteria

- [ ] pr-style-guide.md has a Diagrams section (when, where, shape, safe syntax)
- [ ] Self-check and Things to leave out updated for diagrams
- [ ] pr-writer.md decides on a diagram, with user-instruction veto
- [ ] open-pr and pr-ready hunk gathering have an explicit numeric cap
- [ ] dev-workflow README /open-pr section mentions the diagram
- [ ] pnpm lint:skills and claude plugin validate . pass
- [ ] Sanity run: complex branch gets a diagram that renders, trivial branch gets none

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created