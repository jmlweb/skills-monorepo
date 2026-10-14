---
id: LRN-031
title: Attach stdin heredocs to the node command so Bash(node:*) covers them; avoid ! preprocessing for flowstate path
status: active
tags: [skills, allowed-tools, claude-code, permissions]
task: 
created: 2026-10-14
---

## Context

Skill audit of 2026-10-14 (all three plugins): scoping `allowed-tools` from bare `Bash` to `Bash(node:*)` and checking the official Claude Code skills docs for `!`command`` preprocessing.

## Insight

- Claude Code matches `Bash(prefix:*)` against the start of the command string. `cat <<'BODY' | node …` starts with `cat`, so the grant never matched and every body-carrying CLI call prompted. `node … --body - <<'BODY'` starts with `node` and matches.
- `!`command`` preprocessing aborts the whole skill invocation when the command fails. `flowstate path` fails by design when no backlog exists, so preprocessing it would remove the "run /flowstate:setup first" branch.

## Application

- Write every stdin-fed CLI call as `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/<cli>.js" <cmd> … --body - <<'BODY'`; `scripts/lint-skills.mjs` rule `bash-scoped` warns on bare `Bash` (exempt: check-task, complete-task, start-task, which run project test/build commands).
- Keep `flowstate path` as a model-run Prerequisites step, never as `!` preprocessing.
