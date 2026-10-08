---
id: PLN-009
title: Split skills into user-invoked and model-invoked
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-028
---

## Goal
Cut always-loaded context by making hand-fired skills user-invoked (`disable-model-invocation: true`), keeping model-invoked only the skills the agent or another skill must reach on its own.

## Context
Idea from mattpocock/skills (`.agents/invocation.md`, `writing-for-agents/SKILL-MECHANICS.md`). Today none of our 27 skills use the flag, so every trigger-heavy description loads on every turn. Per `plugins/flowstate/references/plugin-docs.md` (Invocation Control Matrix), `disable-model-invocation: true` removes the description from context and blocks Claude invocation, including via the Skill tool from other skills.

## Approach
1. Audit every skill: could the model usefully reach for it autonomously, or does another skill call it via the Skill tool? Record verdict per skill.
2. Candidates for user-invoked: flowstate `condense-tasks`, `condense-learnings`, `setup`, `parallel`, `review-idea`, `triage-report`; atlassian-polish `atlassian-setup`; dev-workflow `agent-handoff`, `pr-ready`; repo-local `.claude/skills/release-plugin`.
3. Check cross-references first (e.g. `next-task` points to `parallel`, `idea`/`log-progress` point to `setup`): those that are suggestions to the user stay valid; any operative Skill-tool call to a flipped skill must become "tell the user to run /x".
4. For flipped skills, set the flag and rewrite `description` as a one-line human-facing summary (strip trigger lists).
5. Add the rule to AGENTS.md (Skills conventions + "New or edited skill" quality bar): trigger-phrase requirement applies to model-invoked skills only.
6. Update `.claude/skills/new-skill` to ask the invocation question up front.
7. Group README command tables by User-invoked / Model-invoked.
8. `claude plugin validate .`, then bump affected plugins.

## Files to Modify
- `plugins/*/skills/*/SKILL.md` — frontmatter flag + description for flipped skills
- `.claude/skills/release-plugin/SKILL.md` — same
- `AGENTS.md` — invocation rule, adjusted quality bar
- `.claude/skills/new-skill/SKILL.md` — invocation step
- `plugins/*/README.md` — grouped command tables

## Risks & Considerations
- Flipping a skill another skill calls breaks that flow silently; audit step 3 is load-bearing.
- Users who relied on auto-trigger phrases ("set up flowstate") must now type the command. Acceptable for rare/destructive skills.
- Renaming is not involved, so no published-command change; still a behaviour change worth noting in release notes.

## Open Questions
- Is `report` or `add-learning` better model-invoked (agent spots a bug/learning mid-session)? Leaning model-invoked.
