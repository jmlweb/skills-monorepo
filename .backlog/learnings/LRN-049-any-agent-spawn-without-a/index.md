---
id: LRN-049
title: Any Agent spawn without a model inherits the caller model, so pin one on every spawn
status: active
tags: [agents, tokens, model, caveman, delegation]
task: TSK-075
created: 2026-11-07
---

## Context
Review of agent delegation token usage (TSK-075, 2026-11-05 to 2026-11-07). The caveman plugin's `cavecrew-builder` agent ships without a `model:` line on purpose: the maintainer closed the equivalent pin PR (JuliusBrussee/caveman#756) because a pin overrides the documented model policy.

## Insight
An agent definition or an `Agent` tool call without a model runs on the caller's model. On this machine that is the top tier, so a 1-2 file edit costs top-tier tokens. caveman 4.0.1 patches installed agent frontmatter from env vars at SessionStart (`CAVECREW_BUILDER_MODEL`, `CAVECREW_REVIEWER_MODEL`, `CAVECREW_INVESTIGATOR_MODEL`, see `src/hooks/cavecrew-model-overrides.js`); the patch persists until the plugin updates, when the hook re-applies it.

## Application
Pin a model on every `Agent` spawn whose work does not need the session model (`model: "sonnet"` for edits that re-read their own diff, `haiku` for lookups). For third-party agents without a pin, use their documented override instead of an upstream PR: on this Mac `~/.claude/settings.json` sets `env.CAVECREW_BUILDER_MODEL=sonnet`, which reaches hooks (LRN-007). Plugin agents in this repo keep an explicit `model:` in frontmatter.
