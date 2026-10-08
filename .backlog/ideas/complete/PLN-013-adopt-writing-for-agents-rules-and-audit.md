---
id: PLN-013
title: Adopt writing-for-agents rules and audit skills for no-ops
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-032
---

## Goal
Codify skill-writing rules (no-ops, positive phrasing, leading words, completion criteria, progressive disclosure) and slim our skills accordingly.

## Context
Idea from mattpocock/skills `writing-for-agents`. His skills median 7-40 lines; ours 75-150, and our house range "60-150 lines" invites padding. Key rules: delete sentences the model obeys by default; state the target behaviour instead of prohibitions (negation primes the forbidden act); collapse repeated phrases into one pretrained leading word; every step ends with a checkable completion criterion; inline what every branch needs, disclose the rest into reference files.


## Approach
1. Rules task: write `docs/writing-skills.md` (<300 lines, our own words): no-ops, positive phrasing over prohibitions, leading words, a checkable completion criterion per step, progressive disclosure (inline what every branch needs, disclose the rest).
2. AGENTS.md: pointer worded as a trigger ("before creating or editing any SKILL.md, read `docs/writing-skills.md`"); replace "House range 60-150 lines" with "as short as the behaviour allows; ceiling 150".
3. Update `.claude/skills/new-skill` to apply the rules (completion criterion per step, no-op pass).
4. Audit tasks, one per plugin (flowstate incl. repo-local `.claude/skills`, dev-workflow, atlassian-polish): no-op sentences, prohibitions without a positive target, steps without completion criteria, reference that should be disclosed.
5. atlassian-polish audit brings `polish-atlassian/SKILL.md` (243 lines) under 150 by disclosing detail into the plugin's `references/`.
6. Verification per slimmed skill: one real invocation, compared against pre-slim behaviour, result recorded in the task's Progress Log.
7. Audit tasks run after TSK-028 (same skills' frontmatter and descriptions); each bumps its plugin with `pnpm bump patch` and passes `claude plugin validate .` and `pnpm test`.

## Files to Modify
- `docs/writing-skills.md` — new rules doc
- `AGENTS.md` — trigger pointer, house-range change
- `.claude/skills/new-skill/SKILL.md` — apply rules
- `plugins/*/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md` — audit edits
- `plugins/atlassian-polish/references/` — disclosed detail from polish-atlassian
- per-plugin version files — via `pnpm bump patch`

## Risks & Considerations
- No-op judgement is model-relative; verify by running, not debating.
- Slimming can drop load-bearing guidance; the per-skill invocation check guards it.
- Collision with TSK-028 on the same files; audits sequenced after it.

## Revision History
- [2026-10-08] Rules doc at `docs/writing-skills.md` with trigger-worded AGENTS.md pointer; split into rules task + 3 per-plugin audits; polish-atlassian must drop under 150 lines; concrete verification per slimmed skill; audits after TSK-028 with patch bump, validate and tests.
