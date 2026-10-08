---
id: PLN-014
title: Record rejected ideas in .out-of-scope directory
status: discarded
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
---

## Goal
Keep one file per rejected concept (why, plus prior requests) so decisions are not re-litigated.

## Context
Idea from mattpocock/skills `.out-of-scope/`. Today won't-fix decisions live scattered: LRN-002 (keep add-task naming), AGENTS.md named mistakes (runtime deps, reintroducing plan/init), LRN-003.

## Approach
1. Create `.out-of-scope/` with files: `harness-name-collisions.md` (add-task naming, LRN-002), `runtime-dependencies.md`, `reserved-command-names.md` (plan/init).
2. Each: short design-doc prose, "Why this is out of scope", "Prior requests/sources" (task/learning IDs).
3. AGENTS.md: pointer line "check `.out-of-scope/` before proposing a rename, dependency or reserved name".
4. Optionally have `review-idea`/`triage-report` check it before approving.

## Files to Modify
- `.out-of-scope/*.md` — new
- `AGENTS.md` — pointer

## Risks & Considerations
- Duplication with learnings; keep learnings as the source of discovery, `.out-of-scope` as the decision record, linking both ways.
