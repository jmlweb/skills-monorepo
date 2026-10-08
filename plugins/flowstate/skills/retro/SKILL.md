---
name: retro
description: Review a session and turn its mistakes into durable fixes, most severe first. Run it manually after a session that went sideways, or pass a session log path to review an older one.
argument-hint: [session-log-path]
disable-model-invocation: true
allowed-tools: [Read, Grep, Glob, "Bash(node:*)", "Bash(git:*)"]
model: sonnet
effort: high
---

# Retro

Review a session, rank what went wrong, and route each finding to the cheapest durable fix: deterministic check > coding standard > learning > steering file.

## Arguments

Session log path (optional): $ARGUMENTS

## Prerequisites

Resolve the backlog directory with `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path`. If it errors, stop and tell the user to run `/flowstate:setup` first (filing needs the backlog).

Done when: the command prints a directory.

## Workflow

### 1. Choose the source

- `$ARGUMENTS` empty: review the current conversation.
- `$ARGUMENTS` is a path (typically `~/.claude/projects/<slug>/<id>.jsonl`): read that file, nothing else from past sessions.

Collect corrections from the user, reverted edits, failed commands, repeated retries, and wasted exploration.

Done when: you can list the raw incidents, each with a one-line description.

### 2. Inventory existing guardrails

Read what already enforces rules: `package.json` scripts, `scripts/pre-commit.mjs` or other git hooks, `.github/workflows/`, and the project steering file (`AGENTS.md` or `CLAUDE.md`). A mistake that no guardrail covers is a finding in its own right.

Done when: each incident is marked covered (name the guardrail that should have caught it) or uncovered.

### 3. Classify

Assign each incident one category: navigation (missing pointer), automated check, coding standard, steering-file bloat or no-op, tool economy, information access. Merge incidents that share a root cause into one candidate and record its frequency.

Done when: every incident belongs to exactly one candidate.

### 4. Rank

Score each candidate by frequency x cost (cost: time lost, rework, risk of publishing or data loss). A missing guardrail outranks a missing pointer at equal score. Present candidates most severe first.

Done when: the list is ordered and each entry shows frequency, cost, and category.

### 5. Route

Pick one destination per candidate:

| Finding | Destination |
|---------|-------------|
| Mechanical: fixed pattern, file location, banned shape | Task for a deterministic check (test, pre-commit step, CI job) |
| Judgement call | Proposed edit to the matching section of the project `AGENTS.md` |
| Non-obvious insight | Learning |
| User-global rule (`~/.claude/rules/`) | Proposal text only; the user applies it |

Done when: every candidate has a destination and a drafted payload (task title, priority and one-line spec; AGENTS.md diff; or learning Title/Context/Insight/Application).

### 6. Get approval per item

Show the ranked table, then ask about each candidate in order: file, edit, or skip. Treat silence as skip.

Done when: every candidate has an explicit answer.

### 7. File approved items

Run only approved items, through the flowstate CLI:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --title "{{TITLE}}" --priority {{P1-P4}} --tags retro --body -
{{SPEC}}
BODY
```

- Bugs or findings: `report-create --title ... --type <bug|finding|improvement|security> --severity <level> --body -`.
- Learnings: first run `learning-search --similar-to "{{TITLE}}" --tags "{{TAGS}}" --limit 5 --json true`. A top score of 5 or more means a duplicate: report the existing LRN and skip. Otherwise run `learning-create --title ... --tags ... --body -`.
- AGENTS.md edits: print the approved diff for the user to apply; this skill has no write tools, and `~/.claude/rules/` is never edited.

Done when: each approved item printed an ID or a diff, or was reported as a duplicate.

### 8. Confirm

```
Retro complete: {{N}} incidents, {{M}} candidates
  Filed: {{TSK/RPT/LRN ids}}
  AGENTS.md diffs proposed: {{sections}}
  Proposals (user-global): {{count}}
  Skipped: {{count}}
```
