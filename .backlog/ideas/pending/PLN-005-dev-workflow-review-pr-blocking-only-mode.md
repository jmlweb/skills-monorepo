---
id: PLN-005
title: dev-workflow: review-pr blocking-only mode
status: pending
created: 2026-10-01
complexity: low
---

## Goal
Make review-pr report only blocking/important findings by default and post only the findings the user picks.

## Context
Usage analysis: 19 prompts with "avoid nitpicking, focus on blocking issues" and 17 follow-ups like "post comments #1 and #2". review-pr currently posts the whole report as a single comment.

## Approach
1. Default severity filter: drop nits/style; `--all` restores them.
2. Number every finding in the report.
3. Post step: user selects numbers; post each as an inline comment (`gh api` review with comments) with one-line wording.
4. Keep approve / request changes / comment options.

## Files to Modify
- `plugins/dev-workflow/skills/review-pr/SKILL.md` — severity default, numbering, selective inline posting
- `plugins/dev-workflow/skills/review-pr/assets/report-template.md` — numbered findings
- `plugins/dev-workflow/README.md` — mention the flag

## Risks & Considerations
- Inline comments need file/line from agents; require agents to output path:line.
- Behavior change for existing users; document in README.
