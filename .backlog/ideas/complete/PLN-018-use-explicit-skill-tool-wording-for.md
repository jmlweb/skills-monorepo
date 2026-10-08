---
id: PLN-018
title: Use explicit Skill-tool wording for operative skill calls
status: discarded
created: 2026-10-08
complexity: low
reviewed: 2026-10-08
---

## Goal
Where a skill itself must run another skill, say "Call the Skill tool with `flowstate:x`" instead of a bare `/flowstate:x` mention; keep `/x` only for suggestions to the user.

## Context
Idea from mattpocock/skills `.agents/invocation.md`: naming the tool raises hit rate; one skill per call. LRN-003 already covers the subagent_type footgun. Current bare mentions: `next-task`, `parallel`, `block-task`, `log-progress`, `setup`, `triage-report`.

## Approach
1. Grep `/flowstate:` etc. in skills; classify each as operative vs user suggestion.
2. Rewrite operative ones; must target model-invoked skills only (coordinate with the invocation-split idea).
3. Add the convention to AGENTS.md Skills section.

## Files to Modify
- `plugins/flowstate/skills/{next-task,parallel,block-task,log-progress,triage-report}/SKILL.md` — wording where operative
- `AGENTS.md` — convention

## Risks & Considerations
- Depends on invocation-split decisions; do after it.
