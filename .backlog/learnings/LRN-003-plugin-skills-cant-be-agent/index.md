---
id: LRN-003
title: Plugin skills can't be Agent subagent_type
status: active
tags: [skill-invocation, agent-tool, plugin-skills, plugin-agents, footgun]
task: 
created: 2026-04-30
---

## Context
Attempted to audit documentation using the `dev-workflow:check-docs` plugin skill by passing it as `subagent_type` to the `Agent` tool.

## Insight
The `Agent` tool's `subagent_type` parameter accepts **agent definitions** only: built-in personas (Explore, Plan, general-purpose, etc.) and plugin agents defined in a plugin's `agents/<name>.md`, addressed as `<plugin>:<agent>` (e.g. `atlassian-polish:atlassian-formatter`). It never accepts **skills**. Plugin skills are invoked via the `Skill` tool, which loads their instructions into the conversation; then you execute the workflow directly using standard tools.

## Application
- **To run a plugin skill**: Use `Skill("plugin:skill-name")` → loads instructions → execute workflow
- **To delegate to an agent**: Use `Agent(subagent_type: "...")` with a built-in persona or a plugin agent (`<plugin>:<agent>`)
- A skill that needs a dedicated subagent ships it as `agents/<name>.md` in the same plugin — see AGENTS.md "Agents and prompt-only plugins"
