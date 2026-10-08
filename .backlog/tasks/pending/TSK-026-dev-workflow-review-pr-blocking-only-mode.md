---
id: TSK-026
title: dev-workflow: review-pr blocking-only mode
status: pending
priority: P3
tags: []
created: 2026-10-08
source: plan/PLN-005
depends-on: []
---

# dev-workflow: review-pr blocking-only mode

## Description

## Goal
Make review-pr report only blocking/important findings by default and post only the findings the user picks.

## Approach
1. Agent output format: every reviewer agent returns one line per finding, `path:line: <severity>: <finding>`, severity from the template buckets (Critical, Must Fix, Should Fix, Nice to Have, Info). Paste the format into each agent prompt (subagents don't inherit skill context) and add it to `assets/checklists.md`.
2. Skill numbers findings across all agents (#1, #2, …).
3. Default filter: show Critical + Must Fix + Should Fix; `--all` adds Nice to Have + Info. The full unfiltered report is still written to `review.md`.
4. Post step: user selects numbers; show the exact comments that will be posted and wait for explicit go-ahead. Post one review via `gh api repos/{owner}/{repo}/pulls/{n}/reviews` with `commit_id` = head SHA, `event` (APPROVE / REQUEST_CHANGES / COMMENT), and `comments[]` (`path`, `line`, `side: RIGHT`, one-line `body`).
5. Fallback: findings whose line isn't in the diff (API 422) go into the review body instead of inline.
6. Keep approve / request changes / comment options; update `argument-hint` to `[PR number or URL] [--all]`.
7. README: document `--all`, the new default, and that the full report stays in `review.md`.
8. Run `claude plugin validate .`.
9. Ship as a minor bump of dev-workflow (new flag + changed default).

## Files to Modify
- `plugins/dev-workflow/skills/review-pr/SKILL.md`
- `plugins/dev-workflow/skills/review-pr/assets/report-template.md`
- `plugins/dev-workflow/skills/review-pr/assets/checklists.md`
- `plugins/dev-workflow/README.md`

## Notes
- Keep SKILL.md within the 150-line house range (76 lines today).


## Acceptance Criteria

- [ ] Every reviewer agent returns path:line: <severity>: <finding> using the template severity buckets; format pasted into agent prompts and documented in assets/checklists.md
- [ ] Findings are numbered across all agents (#1, #2, ...)
- [ ] Default report shows Critical, Must Fix and Should Fix; --all adds Nice to Have and Info; full unfiltered report still written to review.md
- [ ] Post step: user selects numbers, sees the exact comments, and gives explicit go-ahead before any gh api write
- [ ] Selected findings posted as one review via gh api pulls/{n}/reviews with head commit_id, event and inline comments[] (path, line, side RIGHT, one-line body)
- [ ] Findings on lines outside the diff (422) fall back to the review body
- [ ] Approve / request changes / comment options kept; argument-hint is [PR number or URL] [--all]
- [ ] README documents --all, the new default and that the full report stays in review.md
- [ ] claude plugin validate . passes
- [ ] Released as a minor bump of dev-workflow

## Notes

## Learnings

## Progress Log

- [2026-10-08] Created