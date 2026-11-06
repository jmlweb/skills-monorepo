# Failure modes

A failure-mode table turns a repo's real incidents into rules an agent can check. Each row names a failure, gives the rule that prevents it, and traces both to something that happened. `harden` reads the table and proposes rows; anyone can add one after an incident.

## Row format

```markdown
| Failure mode | Prevention rule | Trace |
|---|---|---|
| **Short memorable name.** What happened, in one or two sentences, with the concrete symptom. | One testable rule: a second reader can check a diff against it. | `abc1234`, or a report, issue or PR id |
```

## Admission rule

A row needs all three parts:

1. **Named**: short enough to quote in a review ("Wrong semver via commit type").
2. **Testable**: "validate the divisor at the boundary" qualifies; "be careful with numbers" does not. Prefer a check a machine runs; a row whose rule became a test, hook or CI job can be deleted.
3. **Traced**: a commit, report, issue or PR that shows it happened. No trace, no row: hypothetical risks belong in a review checklist.

Merge rows sharing a root cause. Keep the list short enough to read before a first edit.

## Where it lives

Reuse the repo's existing section when it has one (commonly "named mistakes", "failure modes" or "pitfalls" in `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or `docs/`). A repo with none gets a `## Named failure modes` section in its agent instructions, or `docs/failure-modes.md` when those are at their size cap.

## Examples

From this plugin's home repo, jmlweb/skills-monorepo:

| Failure mode | Prevention rule | Trace |
|---|---|---|
| **Hook needs a tool users lack.** A hook called `fd`, which broke every Bash call for users without it. | Hooks use only bash, coreutils and `jq`. | commit `6112cfc` there |
| **Pushes without checking the remote.** One push silently carried three earlier unpushed commits. | Run `git fetch` and show `git log --oneline origin/main..HEAD` before pushing. | named mistake 28 in its `docs/agent-playbook.md` |
