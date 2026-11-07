---
id: LRN-057
title: Agent tools entries for an absent MCP server are dropped silently when any other tool resolves
status: active
tags: [claude-code, plugin-agents, mcp, tools]
task: TSK-077
created: 2026-11-07
---

## Context
`ui-auditor` lists `Read` plus named `mcp__chrome-devtools__*` tools. The official docs (errors page, "Agent would be spawned with zero tools") refuse the launch only when every `tools` entry fails to match.

## Insight
With one built-in tool present, a missing or renamed MCP server yields a running agent with no browser, not an error, so a "clean" report is possible by accident. Plugin agents cannot bring their own server either: `mcpServers` in agent frontmatter is an ignored field.

## Application
Guard twice: the skill checks for the concrete tool (`mcp__chrome-devtools__evaluate_script`) before delegating, and the agent replies `MISSING:` when the tool is absent. Apply both guards to any agent that depends on MCP tools.
