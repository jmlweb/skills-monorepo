---
id: LRN-003
title: Plugin skills can't be Agent subagent_type
status: active
tags: [skill-invocation, agent-tool, plugin-skills, footgun]
task: 
created: 2026-04-30
---

## Context
Attempted to audit documentation using the `dev-workflow:check-docs` plugin skill by passing it as `subagent_type` to the `Agent` tool.

## Insight
The `Agent` tool's `subagent_type` parameter only accepts **built-in agent personas** (code-reviewer, backend-architect, code-simplifier, etc.) — not plugin skills. Plugin skills are invoked via the `Skill` tool, which loads their instructions into the conversation. Then you execute the workflow directly using standard tools.

## Application
- **To run a plugin skill**: Use `Skill("plugin:skill-name")` → loads instructions → execute workflow
- **To delegate to an agent**: Use `Agent(subagent_type: "...")` with a built-in agent type only
- Plugin skills != agent types. They serve different purposes.
