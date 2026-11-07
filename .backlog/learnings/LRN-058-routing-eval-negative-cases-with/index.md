---
id: LRN-058
title: Routing eval negative cases with a built-in owner need external: true and prompts free of description tokens
status: active
tags: [routing, evals, skills, tf-idf]
task: TSK-077
created: 2026-11-07
---

## Context
TSK-077 asked for a "Not for run" negative case; `run` is a built-in skill and `evaluatePlugin` in `scripts/routing-eval.mjs` fails on owners not in the plugin.

## Insight
`{"owner": "run", "external": true}` skips the owner-in-index checks and keeps "this skill must not rank first". TF-IDF makes any prompt sharing a token with the "Not for" clause (`run`, `launch`, `page`) rank the skill first, so the external prompt must avoid every description token. `stem()` strips one suffix and never collapses doubled consonants ("screenshotting" stems to "screenshott", not "screenshot"), so check tokens with `tokenize()`, not by eye.

## Application
Use the `external` flag for built-in owners and phrase the prompt from words absent in the description ("start the dev server and show me the app").
