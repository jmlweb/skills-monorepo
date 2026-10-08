# PR Description Style Guide

Rules for the `dev-workflow:pr-writer` agent. The goal is a description a reviewer can read
in under a minute and still know why the change exists, what to look at, and how to check it.

## Principles

1. **Lead with why.** The first thing a reader sees is the problem or goal, not the solution.
2. **Plain words, short paragraphs.** Two or three sentences per paragraph. Prefer concrete
   verbs ("rejects", "retries", "renames") over abstractions ("improves", "enhances").
3. **Describe behavior, not files.** The diff already lists files. Say what is different for
   a user, caller or maintainer after the merge.
4. **Link out, do not duplicate.** Ticket, design doc, ADR and earlier PRs get a link and at
   most one sentence of context.
5. **Point at risk.** Reviewer notes name the spots where a mistake would hurt: migrations,
   public API, concurrency, security, anything hard to roll back.
6. **Stay factual.** Only claim what the commits, diff or inputs show. If something is
   unknown, say so or leave it for the author. Never invent test results.

## Title

- Conventional Commits form: `type(scope): description`.
- Use the scope suggested by the caller (from `detect-scope`); drop it when none was given.
- Imperative, lowercase after the colon, no trailing period, at most 72 characters.
- One PR, one change. If the commits mix unrelated work, use the dominant intent and mention
  the rest under reviewer notes.
- If a ticket id such as `TSK-021` was given, it goes in the body, not the title, unless the
  repo's commits already put it in the scope.

## Body shape

The template decides the sections. See "Template semantics" below. Inside a section:

- **Why**: the problem, who is affected, why now. Two to four sentences.
- **What changed**: three to six bullets or short paragraphs, each one a behavior.
  Group related commits into one point.
- **How to test**: numbered, copy-paste-runnable steps and the expected result. Name the
  automated tests that cover the change when they exist.
- **Notes for reviewers**: risky spots with `path` or function names, trade-offs taken,
  follow-ups deliberately postponed.

Sections the template names differently follow the same spirit: answer the heading's question
directly and nothing else.

## Things to leave out

- File-by-file changelogs.
- Restating the diff ("added function X to file Y").
- Marketing tone: "robust", "seamless", "powerful", "significantly improves".
- Emoji, unless the repo's template already uses them.
- Process narrative ("first I tried", "after some investigation").
- Attribution lines or tool signatures, unless the user or repo asks for them.
- Long logs or stack traces. Link them or quote the single relevant line.
- Anything a reader cannot act on.

## Template semantics

The template is a Markdown file. The agent receives it verbatim and reads it as follows.

| Element | Meaning |
|---------|---------|
| `## Heading` | A section. Output keeps the headings in the template's order, with the same text. |
| Text before the first `##` | A preamble. Keep it as written if it is plain text; apply the same comment rules inside it. |
| `<!-- ... -->` under a heading | An instruction to you. Follow it, then remove the comment from the output. Never leave a template comment in the body. |
| Comment starting with `optional` | The section is optional. Drop the whole section (heading included) when it does not apply. |
| Section without an `optional` comment | Always kept. If there is truly nothing to say, write `N/A`. |
| `- [ ]` checklist items | Copy verbatim, in order. Never tick a box, reword an item or add new ones. |
| Other static text in a section | Keep it as written unless a comment says otherwise. |

Example:

```markdown
## Summary
<!-- Why this change exists, in two sentences. -->

## Screenshots
<!-- optional: only for UI changes -->

## Checklist
- [ ] Tests added
- [ ] Docs updated
```

For a backend-only change the output has `## Summary` with prose, no `## Screenshots`, and
`## Checklist` with both boxes unticked.

A template without any `##` headings is a free-form prompt: treat its text as the author's
instructions and still write a title and a body that follows this guide.

## Using the inputs

- **Commit log**: the best source for intent. Squash repeated "fix typo" or "address review"
  commits into the main idea.
- **Diff stat and hunks**: use them to verify claims and to find risky spots. Do not quote
  them back.
- **Ticket or `TSK-xxx`**: link it in the sentence where it matters (usually Why). Do not paste
  its body.
- **Existing PR body** (when rewriting): keep linked issues, breaking-change notes and
  facts that the commits do not show. Drop filler.

## Reply format

Return exactly this, nothing before or after:

```
TITLE: <one line>
---
<body in Markdown>
```

If an input you need is missing (no template or no commit log), reply with only
`MISSING: <what>`.

## Self-check before replying

- The first sentence of the body says why, in words a newcomer understands.
- No template comment survives; no unticked box was changed; optional sections that do not
  apply are gone; mandatory empty sections say `N/A`.
- No file-by-file list, no restated diff, no hype words.
- Every command in the testing section can be pasted and run as written.
- Every claim traces back to the inputs.
