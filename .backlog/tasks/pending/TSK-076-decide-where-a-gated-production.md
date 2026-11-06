---
id: TSK-076
title: Decide where a gated production protocol lives
status: pending
priority: P3
tags: []
created: 2026-11-06
source: idea/PLN-034
depends-on: []
---

# Decide where a gated production protocol lives

## Description

### Goal

Decide how the gated production protocol from `subbuteo` reaches other projects, then make that one change. The candidates are a `kickstart` template section or a `dev-workflow` skill.

### Approach

1. Read `subbuteo` `prod-ops` and `deploy` in full and separate generic steps from WP facts.
2. Compare the two placements against one test: would the result change agent behaviour in a project with no prod notes yet?
3. Recommended placement: extend `## Project skill proposal` in `plugins/flowstate/shared/kickstart-templates.md` with a conditional rule for projects with a production target. The proposal carries the write steps (read prod, back up, get approval, apply, verify live with rollback ready) and placeholders for project facts.
4. Extend the `kickstart` sandbox fixture only if the template change affects its checks.

### Decisions from review

- The hook is `## Project skill proposal`, not `## Rules`. `kickstart` step 3 already proposes project skills and writes approved ones behind checkpoint 2, so no new `kickstart` step is needed.
- No new grilling signal. Infer a production target from the grilled scope and constraints. The proposal is user-approved, so a wrong inference costs one declined row.
- Cache flushing is a project fact, so it is a placeholder under "apply", not a separate step.
- The template reaches new projects only. Existing projects get nothing unless the user copies it.

## Acceptance Criteria

- [ ] subbuteo prod-ops and deploy are read and generic steps are separated from WP facts
- [ ] Both placements are compared on whether the result changes agent behaviour in a project with no prod notes
- [ ] kickstart-templates.md section Project skill proposal gains a conditional production block with write steps and placeholders for project facts
- [ ] Projects with no production target get no proposal
- [ ] kickstart-reviewer and sandbox-kickstart are updated only if the change affects them

## Notes

## Learnings

## Progress Log

- [2026-11-06] Created