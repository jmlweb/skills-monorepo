---
id: LRN-045
title: parallel SKILL.md body sits at the 150-line lint ceiling
status: active
tags: [skills, lint, flowstate]
task: TSK-055
created: 2026-10-26
---

## Context
Adding the worktree cleanup to flowstate parallel step 7 pushed the body to 153 lines and lint-skills warned body-length (max 150).
## Insight
The parallel skill body was already exactly 150 lines, so any addition must be paid for by folding redundant lines elsewhere (bullet lists into one sentence, standalone follow-up sentences into the previous paragraph).
## Application
Before extending a long skill, run node scripts/lint-skills.mjs and count the body; plan the trims together with the addition.
