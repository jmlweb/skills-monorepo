---
name: new-skill
description: Scaffold a new skill inside an existing plugin following house conventions — frontmatter, model tiering, trigger-rich description, CLI-mutates/skill-orchestrates split, README table, validation. Use when the user says "add a skill", "new skill", "create a slash command", or "scaffold a skill for <plugin>". Not for a whole new plugin (use new-plugin) or for project-local .claude/skills.
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

Done when: tier is stated in one line with its reason.

### 2. Pick the invocation mode

If neither the model nor another skill (via the Skill tool) needs to reach this skill, the
user fires it by hand: set `disable-model-invocation: true`, write a one-line human-facing
description, and skip step 2b (done when the mode is chosen).

### 2b. Draft the description — this is the router (model-invoked skills)

- Third person, one clause on the outcome; no steps, tools or validation mechanics.
- ≥3 quoted trigger phrases a user would actually type ("add task", "new task").
- Ask which neighbouring skill or native command is confusable; add "Not for X (use Y)"
  for each. Shape: `docs/writing-skills.md` §6.
- For a discipline skill (value is resisting a shortcut), offer a `## Rationalizations`
  section per `docs/writing-skills.md` §7.

Done when: the description has at least 3 quoted triggers and a "Not for" clause where a sibling is confusable.

### 3. Write `plugins/<plugin>/skills/<name>/SKILL.md`

Read `docs/writing-skills.md` first. Template (house shape — as short as the behaviour
allows; ceiling 150 lines):

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

<What this does and the end state.>

## Arguments

`$ARGUMENTS` — <meaning; how to handle absence>.

## Prerequisites

<Checks before mutating anything; abort with a reason if one fails.>

## Workflow

### 1. <Step>

<Flowstate mutations:>
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" <command> --json true

Done when: <observable condition — CLI output, file state, user answer>.

## Confirmation

<Fenced block template of what to show the user when done.>
```

Rules while writing:

- `allowed-tools` gets only what the workflow actually uses; prefer `Bash(git:*)` over `Bash`.
- Prose shared with sibling skills goes to `plugins/<plugin>/shared/*.md`, referenced as
  `${CLAUDE_PLUGIN_ROOT}/shared/<file>.md` — never duplicated, never by relative path.
- Calling another skill: "Call the Skill tool with `<plugin>:<skill>`", one skill per call,
  model-invoked targets only; suggestions to the user use `/<plugin>:<skill>`.
- Add a "run setup first" pointer only for a hard dependency; state prohibitions as target behaviour.

### 4. No-op pass

Delete each draft sentence a fresh model would obey without being told (role-play openers,
restated titles, "be careful", step recaps).

Done when: a second read finds nothing more to delete and the body is ≤150 lines.

### 5. Register and document

1. Add a row to the command table in `plugins/<plugin>/README.md` (match the existing
   emoji/format of that table).
2. If the plugin has a root `SKILL.md` listing slash commands (flowstate does), add it there too.

Done when: the README table (and root `SKILL.md` where present) has a row for the skill.

### 5b. Add routing cases

For model-invoked skills only, add to `plugins/<plugin>/evals/routing.json`: ≥3 positive prompts and ≥2 near-miss
negatives (each with the neighbouring `owner` skill). Run `node scripts/routing-eval.mjs`;
raise the ratchet with `--update-ratchet` when the rank-1 rate improved. For descriptions that
overlap a neighbour, run `claude plugin eval plugins/<plugin> --case '<glob>'` before and after
any later description edit.

Done when: the script exits 0.

### 6. Validate

```bash
pnpm lint:skills
claude plugin validate .
```

Both must pass with no error or warning for the new skill. Then list each AGENTS.md "New or
edited skill" checkbox with its status.

Done when: `claude plugin validate .` exits 0 and each quality-bar checkbox has a status.

### 7. Version note

A new skill is a `feat` → next release is at least **minor**. Leave the bump to the release and remind the user in the confirmation.

## Confirmation

```
Created /<plugin>:<name>
Tier:     <model>[/<effort>] — <reason>
Files:    skills/<name>/SKILL.md, README.md row[, root SKILL.md row]
Validate: pnpm lint:skills ✓, claude plugin validate . ✓
Release:  pending — needs minor bump (pnpm bump minor) when you next release <plugin>
```
