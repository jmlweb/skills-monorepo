# Kickstart templates

Read by the `kickstart` skill when it drafts project files, and by the
`kickstart-reviewer` agent when it checks them, so both judge against the same rules.
`{{…}}` marks a value to fill; delete a template line that does not apply rather than
leaving it empty.

## Product frontier (grilling)

Ask these alongside goal, users, scope and constraints:

- **Problem**: the pain in the user's words, and the evidence it exists (a forum thread,
  a support request, the user's own repeated chore).
- **Workaround**: how users cope today and what that costs them (time, money, errors).
- **Why now**: what changed that makes the project worth starting today.
- **Success metric**: one measurable signal that the goal is met (users, revenue, stars,
  a skill demonstrated), with a target and a date.
- **Riskiest assumption**: the belief that, if false, makes the project pointless.

## Evaluation rubric (`docs/evaluation.md`)

- Both verdicts come first, the reasons after them.
- **Feasibility** is `feasible`, `feasible with caveats` or `infeasible`. Infeasible
  names the blocking constraint and is the only verdict that stops the run.
- **Build** is `build`, `build with changes` or `don't build`, with one reason. It
  answers "should this exist", weighing need, gap and viability for the goal. "Build with
  changes" names the change. "Don't build" is advice: the user may still proceed.
- **Need** cites evidence the pain exists and describes the workaround and its cost.
  Evidence without a source is marked `unverified: user to confirm`.
- **Market**: every competitor claim carries a source link, or the
  `unverified: user to confirm` marker. When WebSearch is unavailable or denied, the
  section says so and lists only alternatives the user named.
- **Gap**: "No gap" is a valid outcome. Write it plainly when an existing tool already
  covers the need.
- **Goal** is exactly one of `money`, `community`, `portfolio`, `learning`.
- **Viability** answers the goal's own question:
  - money: who pays, how much, and the evidence they would (a competitor's price, a
    pre-order, a stated budget)
  - community: where the users already gather and how they would find the project
  - portfolio: what the project demonstrates, and to whom
  - learning: which skill the build exercises, and whether the scope forces it
- **Riskiest assumption** gets its cheapest validation: a step that costs hours, not
  weeks (a search, a post in the users' forum, a hand-made prototype run). Run it
  during the evaluation when the session can (WebSearch, reading forums); otherwise it
  becomes task 1.
- **Kill criteria**: the observable result, with a date, that means stop.

```markdown
# Evaluation: {{PROJECT}}

**Feasibility:** {{feasible | feasible with caveats | infeasible}} — {{one-line reason}}
**Build:** {{build | build with changes | don't build}} — {{one-line reason}}
**Goal:** {{money | community | portfolio | learning}} — {{success metric, target, date}}

## Need
{{the pain and its evidence (source or "unverified: user to confirm")}}
{{current workaround and its cost}}

## Feasibility
{{constraints checked and how each holds}}

## Market
| Alternative | What it covers | Source |
|-------------|----------------|--------|
| {{name}} | {{coverage}} | {{link or "unverified: user to confirm"}} |

## Gap
{{the differentiator, or "No gap: {{alternative}} already covers this."}}

## Viability
{{the goal's question from the rubric, answered with evidence}}

## Riskiest assumption
{{the assumption}} — validation: {{cheapest test}} — result: {{outcome, or "pending: task 1"}}

## Kill criteria
{{observable result and date that means stop}}
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

## Problem
{{the pain, its evidence, and the current workaround with its cost}}

## Users
{{who uses it and in which situation}}

## Success metric
{{measurable signal, target and date}}

## Riskiest assumption
{{the assumption and how task 1 tests it (or its validation result)}}

## Kill criteria
{{observable result and date that means stop}}

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

## Seed tasks

- Each task delivers something a user can see or try. "Set up the database" is a
  layer; "a user loads a sliced file and sees its temperature bands" is an outcome.
- Task 1 is the cheapest test of the riskiest assumption, unless the evaluation already
  ran it and it held.
- The tasks after it form a walking skeleton: the thinnest end-to-end path a user can
  run, then tasks that thicken it. 3–8 tasks.
- Close the round by restating the kill criteria and asking the user to confirm them.

Task body:

```markdown
**Outcome:** {{what the user can do once this is done}}
**Validates:** {{the assumption this tests, or "none"}}
**Implements:** {{ADR-NNNN, …}}
```
