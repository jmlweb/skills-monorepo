---
id: PLN-005
title: dev-workflow: review-pr blocking-only mode
status: approved
created: 2026-10-01
complexity: low
reviewed: 2026-10-08
task-id: TSK-026
---

## Goal
Make review-pr report only blocking/important findings by default and post only the findings the user picks.

## Context
Usage analysis: 19 prompts with "avoid nitpicking, focus on blocking issues" and 17 follow-ups like "post comments #1 and #2". review-pr currently posts the whole report as a single comment.

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
- `plugins/dev-workflow/skills/review-pr/SKILL.md` — agent output format, numbering, severity default, `--all`, confirm-then-inline posting, 422 fallback, argument-hint
- `plugins/dev-workflow/skills/review-pr/assets/report-template.md` — numbered findings
- `plugins/dev-workflow/skills/review-pr/assets/checklists.md` — required `path:line: <severity>: <finding>` output format
- `plugins/dev-workflow/README.md` — `--all` flag, new default, behavior-change note

## Risks & Considerations
- Inline comments need file/line from agents; enforced by the output format in step 1.
- Lines outside the diff hunks are rejected by the API (422); handled by the step 5 fallback.
- Posting publishes under the user's account; explicit confirmation required before any `gh api` write.
- Behavior change for existing users (filtered default); document in README.

## Revision History
- [2026-10-08] Mapped filter to template severity buckets; added structured agent output format and numbering step; specified gh api review payload, 422 fallback and confirm-before-post; added checklists.md to files; argument-hint, README note on review.md, validate and minor-bump steps.
