# Kickstart templates

Read by the `kickstart` skill when it drafts project files, and by the
`kickstart-reviewer` agent when it checks them, so both judge against the same rules.
`{{…}}` marks a value to fill; delete a template line that does not apply rather than
leaving it empty.

## Evaluation rubric (`docs/evaluation.md`)

- The verdict comes first, the reasons after it.
- Feasibility is one of `feasible`, `feasible with caveats`, `infeasible`. Infeasible
  names the blocking constraint.
- Every competitor claim carries a source link. A claim without one is written as
  `unverified: user to confirm`. When WebSearch is unavailable or denied, the whole
  market section says so and lists only alternatives the user named.
- "No gap" is a valid outcome. Write it plainly when an existing tool already covers
  the need; a learning or portfolio goal can still justify building.
- The goal is exactly one of `money`, `community`, `portfolio`, `learning`, plus one
  sentence on what success looks like.

```markdown
# Evaluation: {{PROJECT}}

**Verdict:** {{feasible | feasible with caveats | infeasible}} — {{one-line reason}}
**Goal:** {{money | community | portfolio | learning}} — {{what success looks like}}

## Feasibility
{{constraints checked and how each holds}}

## Market
| Alternative | What it covers | Source |
|-------------|----------------|--------|
| {{name}} | {{coverage}} | {{link or "unverified: user to confirm"}} |

## Gap
{{the differentiator, or "No gap: {{alternative}} already covers this."}}

## Why proceed
{{how the goal justifies building, given the gap above}}
```

## ADR (`docs/adr/NNNN-<slug>.md`)

Numbered from `0001`, one decision per file. **Altitude rule:** the Decision names a
mechanism class ("server push channel", "embedded relational store", "pure function
over parsed G-code"), never a product, library, framework or vendor. Products the
project integrates with as domain facts (the slicer it targets, the API it consumes)
belong in Context, not in Decision.

```markdown
# {{NNNN}}. {{Decision title}}

**Status:** proposed

## Context
{{the force that makes a decision necessary: goal, constraint, user need}}

## Decision
{{the mechanism class chosen, in one or two sentences}}

## Consequences
- {{what becomes easier}}
- {{what becomes harder or is ruled out}}
```

Status moves `proposed` → `accepted` once the user approves the review checkpoint;
a later ADR that replaces this one sets `superseded by {{NNNN}}`.

## `AGENTS.md`

Each rule is testable: a second reader can check a diff against it without asking.
"Write clean code" fails that test; "every public function has a unit test" passes.

```markdown
# AGENTS.md

{{one paragraph: what the project is, for whom, and its goal}}

## Map
{{top-level directories and what lives in each; "none yet" is fine}}

## Commands
{{build / test / run commands, or "to be defined in the first task"}}

## Rules
- {{testable rule derived from an ADR (cite it: ADR-0001)}}

## Decisions
See `docs/adr/`. A change that contradicts an accepted ADR adds a new ADR first.
```

## `docs/overview.md`

```markdown
# {{PROJECT}}

{{one-paragraph pitch: problem, user, outcome}}

## Users
{{who uses it and in which situation}}

## Scope
- In: {{capability}}
- Out: {{explicitly excluded capability}}

## Constraints
{{platform, budget, time, legal, compatibility}}

## Architecture
{{one line per ADR: mechanism and why}}
```

## Project skill proposal

Propose a project skill only for a procedure the project will repeat (a release, a
fixture refresh). Show name, one-line description and the steps. Write
`.claude/skills/<name>/SKILL.md` only after the user approves that proposal.
