---
id: PLN-034
title: Decide where a gated production protocol lives
status: approved
created: 2026-11-06
complexity: low
reviewed: 2026-11-06
task-id: TSK-076
---

## Goal

Decide how the gated production protocol from `subbuteo` reaches other projects, then make that one change. The candidates are a `kickstart` template section or a `dev-workflow` skill.

## Context

`subbuteo` has `deploy` and `prod-ops`. Their shape is general even though every command is WP-specific:

- Rule zero: classify the operation as read-only or write.
- Write protocol: read prod first, back up, get approval, apply, flush caches, verify live with the rollback ready.
- Hard rules: never auto-deploy, always dry-run first, show the diff, get explicit approval.

Other projects already use a smaller form of this gate. `seanp` `release` and `templatetower` `release-gate` both stop on failure and ask before publishing, and `website` `refresh-content` asks before making content public.

A generic skill would hold little beyond those steps, because the real value is in project facts: hosts, transports, caches and traps. That points to a template that makes each project write its own version. `plugins/flowstate/shared/kickstart-templates.md` already has a `## Rules` section and generates project procedures.

## Approach

1. Read `subbuteo` `prod-ops` and `deploy` in full and separate generic steps from WP facts.
2. Compare the two placements against one test: would the result change agent behaviour in a project with no prod notes yet?
3. Recommended placement: add a conditional block to `kickstart-templates.md` for projects with a production target, generating a project skill with the five write steps and placeholders for project facts.
4. Extend the `kickstart` sandbox fixture if the template change affects its checks.

## Files to Modify

- `plugins/flowstate/shared/kickstart-templates.md` — conditional prod protocol block
- `plugins/flowstate/agents/kickstart-reviewer.md` — only if the review criteria need the new block
- `scripts/sandbox-kickstart.mjs` — only if its checks cover the template output

## Risks & Considerations

- A template only reaches new projects. Existing ones get nothing unless the user copies it.
- A generic skill could teach a false sense of safety when it lacks project facts such as rollback steps.
- Keep the block conditional, so projects with no production target do not get an empty skill.

## Open Questions

- Does a project need a production target signal in `kickstart` grilling, or can the skill infer it from the goal statement?
