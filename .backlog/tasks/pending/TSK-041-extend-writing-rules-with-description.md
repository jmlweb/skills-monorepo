---
id: TSK-041
title: Extend writing rules with description shape and rationalization tables
status: pending
priority: P3
tags: []
created: 2026-10-08
source: plan/PLN-023
depends-on: []
---

# Extend writing rules with description shape and rationalization tables

## Description

## Goal
Add two rules to the skill-writing doc that TSK-032 creates (`docs/writing-skills.md`):
1. Descriptions say what the skill does and when to use it, never how.
2. Discipline skills may carry a rationalization table.

The TSK-028 description rewrites and the TSK-033..035 audits would then apply both.

## Context
Source: the review of agent-skill repos (2026-10-08).

Description shape:
- obra/superpowers `skills/writing-skills/SKILL.md` L152-180: "The description should ONLY describe triggering conditions", with evidence. A description that read "code review between tasks" made an agent run one review, even though the skill body specified two. Rewriting it to triggers only fixed this. Agents follow a workflow summary in the description and skip the body.
- addyosmani/agent-skills `docs/skill-anatomy.md`: description = what + "Use when…", never a workflow summary; enforced in `scripts/lib/skill-lint.js`.
- anthropics/skills `skills/docx/SKILL.md` frontmatter: triggers, then an explicit "Do NOT use for PDFs, spreadsheets…" to separate it from neighbouring skills.

Rationalization tables:
- superpowers `skills/verification-before-completion/SKILL.md` and addyosmani `docs/skill-anatomy.md` L67-72: tables pairing the excuse the model is likely to give with the reality, plus Red Flags lists. addyosmani makes them a required section, enforced by lint.
- superpowers' 2026-06 positive-instruction experiment (`docs/superpowers/specs/2026-06-10-positive-instruction-redesign-design.md`) replaced prohibitions with positive recipes, but kept the recognition tables. So they don't conflict with TSK-032's positive-phrasing rule.

Our state (heuristic scan of `description:` lines, 2026-10-08):
- 8 skills summarize workflow steps in the description: `atlassian-setup`, `changeset`, `check-docs`, `commit`, `review-pr`, `condense-learnings`, `condense-tasks`, `log-progress`. Example: `condense-tasks` says "structural trim (drop Notes scratchpad, prune middle Progress Log) plus caveman-style prose compression… Validated against load-bearing invariants".
- 7 skills already have a "do not use / not for" clause; the rest have none, including flowstate pairs that overlap (`idea`/`add-task`, `check-task`/`overview`).
- AGENTS.md "Skills (SKILL.md)" says a description "states what the skill does, then concrete triggers". It doesn't forbid workflow summaries.

PLN-013 → TSK-032..035 define the doc and the audits. This idea adds scope to the doc only.

## Approach
1. Description rule in `docs/writing-skills.md`:
   - Shape: one clause stating what the skill does (outcome, not steps), then ≥3 quoted triggers, then "Not for X (use Y)" whenever a neighbouring skill could be confused with it.
   - Never list steps, tools or validation mechanics in the description; they belong in the body.
   - Include one bad/good pair taken from our own skills (`condense-tasks` before and after) and the superpowers evidence in one sentence.
2. Rationalization-table rule in `docs/writing-skills.md`:
   - Optional section `## Rationalizations` for discipline skills only. These are skills whose value is resisting a shortcut: `complete-task`, `commit`, `review-pr`, `parallel`, `log-progress`.
   - Format: a two-column table, `Thought | Reality`, at most 6 rows, each row a real shortcut the model takes.
   - It is not a prohibition list. Each Reality cell states the target behaviour, which keeps it consistent with the positive-phrasing rule.
3. AGENTS.md "Skills (SKILL.md)" conventions: replace "states what the skill does, then concrete triggers" with the shape from step 1, and point to the doc.
4. `.claude/skills/new-skill/SKILL.md`: when drafting a description, apply the shape and ask which neighbouring skill needs a "Not for" clause; offer the rationalization section for discipline skills.
5. Add to TSK-033/034/035 via `task-update --log`: each audit rewrites workflow-summary descriptions to the new shape and considers the table for its discipline skills. TSK-028 already rewrites descriptions for user-invoked skills; note there that model-invoked descriptions follow this rule.



## Acceptance Criteria

- [ ] Started only after TSK-032 has created docs/writing-skills.md
- [ ] docs/writing-skills.md has a description-shape rule (what clause + triggers + Not for X, no workflow steps) with a bad/good pair from condense-tasks
- [ ] docs/writing-skills.md has an optional Rationalizations section rule (Thought | Reality, max 6 rows, discipline skills only)
- [ ] AGENTS.md description convention and .claude/skills/new-skill updated
- [ ] TSK-028 and TSK-033..035 annotated via task-update --log
- [ ] dev-workflow:check-docs passes on the doc

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created