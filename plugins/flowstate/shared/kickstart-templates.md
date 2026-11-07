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
- **Why now**: what changed that makes the project worth starting today (a new device,
  a tool going unmaintained, a deadline). "Nothing changed" is a valid answer and
  weighs on the Build verdict.
- **Success metric**: one measurable signal that the goal is met (users, revenue, stars,
  a skill demonstrated), with a target and a date.
- **Riskiest assumption**: the belief that, if false, makes the project pointless.
- **Kill criteria**: propose one observable result with a date that means stop
  (derived from the success metric and the riskiest assumption); the user confirms or
  rewrites it.

## Evaluation rubric (`docs/evaluation.md`)

- Both verdicts come first, the reasons after them.
- **Feasibility** is `feasible`, `feasible with caveats` or `infeasible`. Infeasible
  names the blocking constraint and is the only verdict that stops without asking to
  proceed.
- **Build** is `build`, `build with changes` or `don't build`, with one reason. It
  answers "should this exist", weighing need, why now, gap, viability for the goal and
  the riskiest-assumption result. "Build with changes" names the change (to the scope
  or to the assumption). "Don't build" is advice: the user may still proceed.
- **Refuted assumption.** When the cheapest validation ran and the assumption failed,
  Build is at most `build with changes` or `don't build`. `build with changes` names a
  replacement assumption (or the narrower scope that makes one hold); the replacement
  then becomes the riskiest assumption in every doc, with result `pending: task 1`, and
  task 1 tests it. The refuted original stays in the evaluation, marked `refuted`.
- **Need** cites evidence the pain exists, describes the workaround and its cost, and
  states why now. Evidence without a source is marked `unverified: user to confirm`.
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
- **Kill criteria**: the observable result, with a date, that means stop, as the user
  confirmed it in grilling.

```markdown
# Evaluation: {{PROJECT}}

**Feasibility:** {{feasible | feasible with caveats | infeasible}} — {{one-line reason}}
**Build:** {{build | build with changes | don't build}} — {{one-line reason}}
**Goal:** {{money | community | portfolio | learning}} — {{success metric, target, date}}

## Need
{{the pain and its evidence (source or "unverified: user to confirm")}}
{{current workaround and its cost}}
Why now: {{what changed, or "nothing changed"}}

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
{{the assumption}} — validation: {{cheapest test}} — result: {{held | refuted | pending: task 1}}
{{when an earlier assumption was refuted: "Replaces: {{original}} — refuted by {{evidence}}"}}

## Kill criteria
{{observable result and date that means stop}}
```

`pending: task 1` is replaced by the real ID (`pending: TSK-XXX`) once step 5 creates it,
or by `pending: not tested, no backlog` when the user declined the backlog.

## Checkpoint recommendations

Each checkpoint opens with one recommendation the user accepts with "yes", per
`grilling.md`.

- **Checkpoint 1**, from the Build verdict:
  - `build`: proceed.
  - `build with changes`: proceed with the named change, folded into Scope before any
    project file is written, so it reaches `docs/overview.md`, the ADRs and the tasks.
    After a refuted assumption, the change is the replacement assumption.
  - `don't build`: stop. Then ask, as its own question, whether to proceed anyway, and
    say whether the goal could justify it (a learning or portfolio goal often does; a
    money goal rarely does). After a refuted assumption, proceeding needs a replacement
    assumption, asked in the same question.
- **Checkpoint 1 again**: when a review fix changes the Build verdict, the
  recommendation for the new verdict is shown before checkpoint 3.
- **Checkpoint 2**: approve, or the specific change (an ADR Decision that names a
  product, a rule nobody could check, an overview section left empty).
- **Checkpoint 3**: approve when every accepted finding is applied, or the finding still
  open.

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
{{the force that makes a decision necessary: goal, constraint, user need, or the riskiest assumption it makes cheaper to test}}

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
{{the pain, its evidence, the current workaround with its cost, and why now}}

## Users
{{who uses it and in which situation}}

## Success metric
{{measurable signal, target and date}}

## Riskiest assumption
{{the assumption and how task 1 tests it, or its validation result; task 1 becomes its TSK ID after step 5}}
If refuted: stop per the kill criteria, or pivot by re-running `/flowstate:kickstart`
with the new assumption.

## Kill criteria
{{observable result and date that means stop}}; checked first against task 1's result:
a refuted assumption meets them unless the user pivots.

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

**Production target.** When the grilled scope or constraints name a live system the
project changes in place (a deployed site or service, a store, a database holding real
users' data, devices in the field), add a `prod-ops` proposal from the template below.
The target is inferred from scope and constraints, with no grilling question of its own;
a wrong inference costs the user one declined proposal. A project with no such target
gets no `prod-ops` proposal. Each `{{…}}` is a project fact from grilling or an existing
runbook; a fact nobody stated is written as `unknown: confirm before the first write`.
When a deploy script already gates code pushes, the description names it as the path for
code and `prod-ops` covers every other write.

```markdown
---
name: prod-ops
description: Gated protocol for any write to {{PRODUCTION TARGET}}. Use when the user says "touch prod", "change it in production", "run it on the server", or "fix it live". Not for reads (safe at any time){{ or for code pushes (use the deploy script)}}.
---

# prod-ops

{{PRODUCTION TARGET}} is live: {{no staging, no easy rollback, real users' data}}.
Reads (`{{command that reads live state}}`) run at any time. A write follows the five
steps below in order, with one approval per operation.

Out of scope: {{what a write never touches: uploads, the database, user credentials}}.

## 1. Read production first

Production diverges from the local copy. Build the change from what production holds:
`{{command that reads the live value or file}}`.

Done when: the current live value or file is in the conversation.

## 2. Back up

Back up what the write touches, on production and locally: `{{backup command}}`, then
`{{copy-down command}}`. Record the backup names in the task notes; they are the rollback.

Done when: the backup exists in both places and its names are in the task notes.

## 3. Get approval

Show the exact command(s) and the rollback command. The approval covers this operation
only.

Done when: the user answered yes to the commands shown.

## 4. Apply

Run the approved command(s) over {{transport: ssh, admin CLI, console}}, then
{{the refresh the change needs: cache flush, service reload, or none}}.
{{Transport traps: no TTY for sudo, a heredoc to a non-interactive remote shell, touch after a file write}}

Done when: every command exited 0.

## 5. Verify live, keep the rollback warm

Check the change at {{live URL, including a page a cache could hide it on}}. Write the
executed rollback command into the task notes, then report done; a failed check runs
the rollback first.

Done when: the live check shows the change and the task notes hold the rollback.
```

## Seed tasks

- Each task delivers something a user can see or try. "Set up the database" is a
  layer; "a user loads a sliced file and sees its temperature bands" is an outcome.
- Task 1 is the cheapest test of the riskiest assumption, unless the evaluation already
  ran it and it held.
- Task 1 gates the rest: every other task lists task 1 in its `depends-on`, and task 1
  carries the strictly highest priority of the seeded tasks. The gate is advisory:
  `depends-on` blocks nothing, `next-task` ranks priority above "unblocks others", and
  `start-task` never checks dependencies, so the priority is what puts task 1 first.
  When the evaluation already validated the assumption (result `held`), there is no
  gate and the skeleton's first task has no dependency.
- After a refuted assumption the user proceeded past, the replacement assumption gets
  its own task 1 and gate. When `docs/evaluation.md` or `docs/overview.md` still shows
  the original as the riskiest assumption, rewrite it to the replacement (write guard
  applies).
- The tasks after it form a walking skeleton: the thinnest end-to-end path a user can
  run, then tasks that thicken it. 3–8 tasks in total.
- Close the round by restating the kill criteria and asking the user to confirm them.
  Then update `docs/evaluation.md` and `docs/overview.md` (write guard applies): the
  confirmed kill criteria, and task 1's real TSK ID in place of "task 1".
- Declined backlog: propose no tasks, still confirm the kill criteria, and write them
  plus `pending: not tested, no backlog` in place of `pending: task 1` and "task 1" in
  both docs.

Task body:

```markdown
**Outcome:** {{what the user can do once this is done}}
**Validates:** {{the assumption this tests, or "none"}}
**Implements:** {{ADR-NNNN, …}}
**If refuted:** {{task 1 only: stop per the kill criteria, or pivot by re-running /flowstate:kickstart with the new assumption}}
```
