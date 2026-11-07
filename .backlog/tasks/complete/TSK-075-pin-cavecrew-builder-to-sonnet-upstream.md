---
id: TSK-075
title: Pin cavecrew-builder to sonnet: upstream PR plus explicit model on every spawn
status: complete
priority: P3
tags: [tokens, agents, upstream]
created: 2026-11-05
source: manual
depends-on: []
started: 2026-11-07
completed: 2026-11-07
---

# Pin cavecrew-builder to sonnet: upstream PR plus explicit model on every spawn

## Description

### Why

The caveman plugin's `cavecrew-builder` agent (`plugins/caveman/agents/cavecrew-builder.md` in github.com/JuliusBrussee/caveman) has no `model:` field in its frontmatter. An agent without a pinned model inherits the caller's model, which on this machine is Fable 5.1, the most expensive tier. The builder does 1-2 file surgical edits; that work does not need the top model. Its siblings `cavecrew-investigator` and `cavecrew-reviewer` already pin `model: haiku`.

### What

1. Open an upstream PR adding `model: sonnet` to the builder agent, placed after `description` to match the siblings. Sonnet rather than haiku because the builder must re-read and verify its own diff.
2. Until the fix lands upstream, pass `model: "sonnet"` explicitly whenever this repo's skills or sessions spawn `caveman:cavecrew-builder`.

### Context

Found during a review of agent delegation token usage on 2026-11-05. The same review pinned `model: "sonnet"` on the `review-pr` spec agent dispatch in `plugins/dev-workflow/skills/review-pr/SKILL.md`.

The caveman repo is not owned by jmlweb, so the upstream change goes through a fork and PR, never a direct push.

## Acceptance Criteria

- [x] Upstream PR opened against JuliusBrussee/caveman adding model: sonnet to plugins/caveman/agents/cavecrew-builder.md, matching the sibling agents layout — evidence: Not applicable: maintainer closed JuliusBrussee/caveman#756 on 2026-08-29; caveman 4.0.1 ships CAVECREW_BUILDER_MODEL override instead. Set env.CAVECREW_BUILDER_MODEL=sonnet in ~/.claude/settings.json and applied it: cached cavecrew-builder.md now has model: sonnet (2026-11-07)
- [x] PR body states why sonnet and not haiku: the builder re-reads and verifies its own diff — evidence: Not applicable, no PR: documented-override route taken (2026-11-07)
- [x] Every place in this repo that spawns caveman:cavecrew-builder passes model: sonnet explicitly until the upstream fix ships (grep finds none without it) — evidence: git grep cavecrew-builder outside .backlog → no matches, no spawn site exists in this repo (2026-11-07)
- [x] A learning records the rule: any Agent spawn without a model inherits the caller model, so pin one on every spawn — evidence: LRN-049 created (2026-11-07)

## Notes

## Learnings

- LRN-049: Any Agent spawn without a model inherits the caller model, so pin one on every spawn
## Progress Log

- [2026-11-05] Created
- [2026-11-07] Checked 2026-11-07: upstream main and installed caveman 4.0.1 have no model field on cavecrew-builder, and that is intentional. The maintainer closed the equivalent PR JuliusBrussee/caveman#756 on 2026-08-29 because a pin overrides the documented model policy. caveman 4.0.1 tests show a CAVECREW_BUILDER_MODEL override that inserts the model line, so criteria 1 and 2 likely no longer apply; decide before starting.
- [2026-11-07] Started
- [2026-11-07] Resolved through the documented env override instead of an upstream PR: env.CAVECREW_BUILDER_MODEL=sonnet in ~/.claude/settings.json, applied to the cached agent (model: sonnet at line 9). Learning LRN-049 records the rule.
- [2026-11-07] Completed