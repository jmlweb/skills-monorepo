# Glossary

The repo's ubiquitous language. Use these terms in skill prose, headings, READMEs and
CLI output. Each entry lists words to avoid.

## Language

**Backlog**:
The `.backlog/` directory holding every entity of one project, managed by the flowstate CLI.
_Avoid_: board, queue, tracker

**Entity**:
A markdown file with YAML frontmatter and a CLI-assigned ID. Exactly four kinds exist: task, idea, report, learning.
_Avoid_: item, record, ticket, issue

**Task**:
A unit of work to implement, with acceptance criteria. ID prefix `TSK`; moves pending → active → complete (or blocked).
_Avoid_: ticket, story, todo

**Idea**:
A proposed change that contains an implementation plan (Goal, Approach, Files to Modify, Risks). ID prefix `PLN` is kept; lives in `ideas/`. Approving an idea creates a task.
_Avoid_: plan (as the entity name), proposal, RFC

**Report**:
A structured record of something observed, typed `bug`, `finding`, `improvement` or `security`. ID prefix `RPT`. Triage turns it into a task or discards it.
_Avoid_: bug or finding as the entity name (they are report types), issue

**Learning**:
A durable insight discovered while working, tagged and searchable. ID prefix `LRN`.
_Avoid_: lesson, note, TIL

## Relationships

- A **backlog** contains **entities** of four kinds.
- An **idea** is reviewed and, once approved, produces one **task** (`task-id` links back; the task's `source` is `idea/PLN-XXX`).
- A **report** is triaged into one **task** or discarded.
- A **task** may depend on other **tasks** (`depends-on`).
- A **learning** records the `task` it came from and feeds later ideas and tasks through search.

## Flagged ambiguities

- `plan` was renamed to `idea` to avoid Claude Code's native `/plan` (AGENTS.md invariant 7). The `PLN` prefix and `ideas/` directory stay as-is. Do not reintroduce `plan` as a command, skill or entity name.
- "Implementation plan" is still valid as a description of what an idea contains. "Plan" alone, naming the entity, is not.
- `init` was renamed to `setup`; do not reintroduce it.
- "Finding" is both a report type and a general word. Name the entity "report"; say "finding" only for the `finding` type.
- "Ticket" appears once, in the `add-task` description as a user trigger phrase. That is routing vocabulary, not a term of this repo.
