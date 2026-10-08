---
id: PLN-019
title: Slim agent-handoff: reference artifacts, suggest skills
status: discarded
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
---

## Goal
Shorter, sharper handoff prompts: reference existing artifacts by path/URL instead of restating them, add a "suggested skills" section, redact secrets.

## Context
Idea from mattpocock/skills `handoff` (16 lines vs our `agent-handoff` 119). Our skill covers multi-repo out/in reconciliation, which his doesn't, so keep scope; borrow the discipline.

## Approach
1. Add rules to the `out` template: no duplication of specs/tasks/PRs (link them), "Suggested skills" section, redact secrets/PII.
2. Run a no-op pass to cut body length.

## Files to Modify
- `plugins/dev-workflow/skills/agent-handoff/SKILL.md`

## Risks & Considerations
- Receiving agent in another repo may lack access to local paths; prefer URLs for cross-repo references.
