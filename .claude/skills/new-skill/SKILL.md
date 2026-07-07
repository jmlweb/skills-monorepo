---
name: new-skill
description: Scaffold a new skill inside an existing plugin (flowstate or dev-workflow) following house conventions — frontmatter, model tiering, trigger-rich description, CLI-mutates/skill-orchestrates split, README table, validation. Use when the user says "add a skill", "new skill", "create a slash command", or "scaffold a skill for <plugin>". Do NOT use for a whole new plugin (use new-plugin) or for project-local .claude/skills.
argument-hint: [plugin] [skill-name] [purpose]
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash(claude:*), Bash(ls:*), Bash(node:*)]
model: sonnet
effort: medium
---

# New Skill

Add a skill to an existing plugin so it passes review on the first try: correct frontmatter,
routing description, right model tier, minimal tools, README updated, validation green.

## Arguments

`$ARGUMENTS` — plugin name, skill name (kebab-case), and a one-line purpose.
Interview for whatever is missing, one question at a time:

1. Which plugin? (list `plugins/*/`)
2. Skill name — kebab-case verb phrase. Check collisions before accepting:
   - existing dirs in `plugins/<plugin>/skills/`
   - Claude Code native commands (`/plan`, `/init`, `/review`, `/commit`, …). `plan` and
     `init` are permanently banned names here (see AGENTS.md invariant 7).
3. Does it mutate state? If it touches `.backlog/` or other CLI-owned files, every mutation
   must shell out to the plugin CLI — if the CLI lacks the needed command, stop and tell the
   user a CLI command (+ tests + dist rebuild) is required first; offer to add it as a
   separate task.

## Workflow

### 1. Pick the model tier

- Deterministic CRUD / formatting / lookups → `model: haiku`, no `effort`.
- Judgment (planning, triage, review, rewriting) → `model: sonnet` + `effort: medium`
  (`high` only for heavy planning like flowstate's `idea`).

State the choice and why in one line.

### 2. Draft the description — this is the router

Requirements, all checkable:

- Third person, starts with what the skill does.
- ≥3 quoted trigger phrases a user would actually type ("add task", "new task").
- A "Use when…" sentence; a "Do NOT use for…" sentence if a sibling skill or native command
  is confusable.

### 3. Write `plugins/<plugin>/skills/<name>/SKILL.md`

Template (house shape — keep body ≤150 lines):

```markdown
---
name: <name>
description: <from step 2>
argument-hint: [<args>]        # omit if no arguments
allowed-tools: [<minimal set — scope Bash, e.g. Bash(git:*)>]
model: <haiku|sonnet>
effort: <medium|high>          # sonnet only
---

# <Title>

<One paragraph: what this does and the end state.>

## Arguments

`$ARGUMENTS` — <meaning; how to handle absence>.

## Prerequisites

<Checks before mutating anything — e.g. `.backlog/` exists; abort with reason if not.>

## Workflow

### 1. <Step>

<For flowstate mutations, always:>
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" <command> --json true
<Multi-line bodies via stdin: `--body -` with a heredoc.>

### 2. <Step>

...

## Confirmation

<Fenced block template of what to show the user when done.>
```

Rules while writing:

- `allowed-tools` gets only what the workflow actually uses; prefer `Bash(git:*)` over `Bash`.
- Prose shared with sibling skills goes to `plugins/<plugin>/shared/*.md`, referenced by
  relative path — never duplicated.
- All paths to bundled files use `${CLAUDE_PLUGIN_ROOT}`.

### 4. Register and document

1. Add a row to the command table in `plugins/<plugin>/README.md` (match the existing
   emoji/format of that table).
2. If the plugin has a root `SKILL.md` listing slash commands (flowstate does), add it there too.

### 5. Validate

```bash
claude plugin validate .
```

Must pass. Then self-check against the AGENTS.md "New or edited skill" quality bar and list
each checkbox with its status.

### 6. Version note

A new skill is a `feat` → next release is at least **minor**. Do not bump now; remind the
user in the confirmation.

## Confirmation

```
Created /<plugin>:<name>
Tier:     <model>[/<effort>] — <reason>
Files:    skills/<name>/SKILL.md, README.md row[, root SKILL.md row]
Validate: claude plugin validate . ✓
Release:  pending — needs minor bump (pnpm bump minor) when you next release <plugin>
```
