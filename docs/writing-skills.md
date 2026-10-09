# Writing skills

Rules for every `SKILL.md` in this repo. They keep skills short and predictable: the
model spends its attention on the parts that change behaviour. Apply them when creating
a skill and again when editing one. Structure and frontmatter conventions live in
`AGENTS.md`; this file covers the prose.

## 1. Delete no-ops

A no-op is a sentence the model would obey without being told. It costs tokens, dilutes
the sentences that matter, and gives a later editor something to preserve by mistake.

Run a no-op pass on the finished draft, one sentence at a time:

1. Cover the sentence. Would a fresh model, given only the rest, still behave the same?
2. If yes, delete it.

Typical no-ops:

- Role-play openers ("You are an expert release engineer").
- Restating the title or description in the first paragraph.
- Generic virtues ("be careful", "be thorough", "write clean output").
- Narrating a command that is already in a code block.
- A closing summary of the steps above it.

Keep a sentence when it encodes something the model cannot infer: a repo convention, an
ordering constraint, a tool quirk, a decision already made.

Judging "would it obey anyway" is relative to the model tier the skill runs on. When
unsure, delete the sentence, run the skill once, and restore it only if behaviour
regressed.

Done when: the pass finds nothing more to delete, and one real invocation behaves like
the pre-edit version.

## 2. State the target, not the prohibition

Naming a forbidden act primes it. Describe what the output should be instead.

| Prohibition | Target behaviour |
|-------------|------------------|
| "Do not hand-edit index.md" | "Change `index.md` through `index-rebuild`" |
| "Don't write long summaries" | "Summarise in at most three lines" |
| "Never guess the plugin" | "Ask which plugin when `$ARGUMENTS` omits it" |
| "Do not skip validation" | "Run `claude plugin validate .` before reporting done" |

Keep a prohibition only when no positive form exists, for example a destructive action
that must not happen under any branch (a tag push publishes a release). Put it next to
the step it guards and give the reason.

Done when: every "don't" or "never" either has a positive rewrite or a one-clause reason
why it cannot.

## 3. Collapse repeated phrases into a leading word

When a skill repeats the same multi-word instruction, pick one word the model already
associates with the behaviour and use it consistently.

- Use "triage", "groom", "bisect", "dedupe", "rebase" and similar terms that carry a
  whole procedure in pretrained meaning.
- Define a local term once, in the first place it appears, then reuse it unchanged.
  Synonyms read as different instructions.
- Name the artifact the same way everywhere (`task file`, not `task file` then `ticket`
  then `entry`).

Done when: no instruction of more than one clause appears twice; each repeat is replaced
by the leading word.

## 4. End every step with a checkable completion criterion

A step is done when something observable says so. Without it the model decides for
itself when to move on, and the decision varies from run to run.

Write the criterion as the last line of the step, phrased as a condition:

```markdown
### 2. Draft the description

Write the description in third person with a "Use when" sentence.

Done when: it contains at least three quoted trigger phrases.
```

Good criteria are observable from output, file state or a command exit code:

- "the CLI prints the new ID"
- "`claude plugin validate .` exits 0"
- "the README table has a row for the skill"
- "the user has answered yes or no"

Weak criteria: "looks right", "is thorough", "seems complete". Rewrite them until a
second reader could check them without asking the author.

The skill as a whole needs one too: the confirmation block is the proof the workflow
reached its end state.

Done when: each numbered step ends with a condition a second reader could verify.

## 5. Disclose progressively

Inline what every branch of the skill needs. Move the rest into a file the model reads
only when it takes that branch.

- Inline: the happy path, the commands every run executes, the checks before mutation.
- Disclose: edge-case handling, long templates, field-by-field format specs, tables of
  rarely used options.
- Disclosed material for one skill goes in the plugin's `references/`. Material shared
  by several skills goes in the plugin's `shared/*.md`.
- Reference bundled files by `${CLAUDE_PLUGIN_ROOT}/...`, never by relative path. Skills
  run from the user's cwd, so relative paths do not resolve.
- Say when to read the file ("when the input is a table, read
  `${CLAUDE_PLUGIN_ROOT}/references/tables.md`"). An unconditional "see references/"
  invites reading it every time and defeats the split.

Size target: as short as the behaviour allows. The ceiling is 150 lines. Needing more
than that is a signal to disclose, not to compress wording.

Done when: removing any disclosed file leaves the happy path intact, and each pointer
states the condition for reading it.

## 6. Shape the description as a router

The description decides whether the skill fires, and the model reads it before the body.
A description that summarises the workflow lets the model follow the summary and skip the
body (superpowers saw an agent run one review because the description said "code review
between tasks", while the body specified two; triggers-only wording fixed it).

Shape, in this order:

1. One clause stating the outcome the skill produces, not the steps it takes.
2. At least three quoted trigger phrases a user would type.
3. "Not for X (use Y)" when a neighbouring skill or native command could be confused with
   it.

Steps, tools and validation mechanics belong in the body.

Bad, from `condense-tasks` before the rewrite (outcome buried under mechanics):

```yaml
description: Condense completed tasks: structural trim (drop Notes scratchpad, prune middle Progress Log) plus caveman-style prose compression (drop articles, filler, hedging) on remaining body. Validated against load-bearing invariants. Use when the user says "condense tasks", "clean up done tasks", "trim completed backlog", or wants to shrink the size of complete task files.
```

Good (illustrative target; the audit tasks apply it to the real file):

```yaml
description: Shrinks completed task files so the done backlog stays cheap to read. Use when the user says "condense tasks", "clean up done tasks", "trim completed backlog", or "shrink the done folder". Not for learnings (use condense-learnings).
```

Done when: the description has one outcome clause, at least three quoted triggers, a
"Not for" clause wherever a sibling overlaps, and no step, tool or check names.

## 7. Add a Rationalizations section to discipline skills (optional)

A discipline skill is one whose value is resisting a shortcut: `complete-task`, `commit`,
`review-pr`, `parallel`, `log-progress`. For these, add a closing `## Rationalizations`
section. Skip it for every other skill; a table on a CRUD skill is a no-op.

Format: a two-column table `Thought | Reality`, at most 6 rows. Each row is a shortcut
the model really takes (taken from an observed run, not invented). Each Reality cell
states the target behaviour, so the table stays consistent with rule 2.

```markdown
## Rationalizations

| Thought | Reality |
|---------|---------|
| "The criteria are obviously met, ticking them can wait" | Tick each criterion through the CLI before moving the task to done. |
| "Hooks are slow, I'll skip them this once" | Commit with hooks on; a failing hook gets fixed, then the commit is retried. |
```

Done when: the section has at most 6 rows, every Thought was observed, and no Reality
cell starts with "Don't" or "Never".

## Setup dependencies: hard versus soft

Many flowstate skills need `.backlog/` to exist. Handle that dependency by kind:

- Hard dependency: the output is wrong or the command fails without setup. State an
  explicit pointer in Prerequisites: "If `.backlog/` is missing, stop and tell the user
  to run `/flowstate:setup` first."
- Soft dependency: the skill degrades gracefully (a summary with empty sections, a
  search with zero hits). Omit the pointer; the model recovers on its own and the line
  would be a no-op.

The audit of 2026-10-08 found all eight existing "run setup first" pointers are hard
dependencies, so none needed removal. Re-run that classification for any pointer you
add: the test is whether the skill's output would be wrong without setup.

## Calling other skills

One convention, so a reader can tell an instruction from a suggestion:

- Operative call (the skill must run): write "Call the Skill tool with
  `<plugin>:<skill>`". One skill per call. The target must be model-invoked; a skill
  with `disable-model-invocation: true` cannot be reached this way.
- User suggestion (the user decides): write `/<plugin>:<skill>` in prose, for example
  "next, the user can run `/flowstate:start-task`".
- Skills are never `subagent_type` values for the `Agent` tool (LRN-003). Agents
  defined in a plugin's `agents/` directory are invoked as `<plugin>:<agent>`.

Done when: every cross-skill reference is either an explicit Skill-tool call or a
slash-command suggestion, never a bare skill name.

## Checklist before you finish

- [ ] No-op pass done; one real invocation behaves as intended
- [ ] No prohibition without a positive rewrite or a stated reason
- [ ] Repeated phrases collapsed into one leading word
- [ ] Every step ends with a checkable condition
- [ ] Body at most 150 lines; extra detail disclosed with a conditional pointer
- [ ] Description follows the router shape; Rationalizations only on discipline skills
- [ ] Setup pointers present only for hard dependencies
- [ ] Skill calls follow the Skill-tool convention above
