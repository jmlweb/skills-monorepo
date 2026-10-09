# Grilling (shared by skills that ask clarifying questions)

Ask the user in rounds, not one question at a time.

## Rounds

- The frontier is every open question whose prerequisites are settled. Ask the whole
  frontier in one round; questions that depend on an unsettled answer wait for a later round.
- Every question carries a recommended answer worded so that "yes" accepts it.
- Look facts up with Read, Grep or Glob. Ask the user only for decisions the repo cannot answer.

## Format

Labelled blocks separated by `---`. A markdown numbered list merges with adjacent
numbered lists when rendered, so each question gets a label instead.

```markdown
**Q1 · Scope**
Does this cover only the CLI? Recommend: yes, skills stay untouched.

---

**Q2 · Priority**
Recommend: P3, nothing blocks on it.
```

Accepting by "yes" applies every recommendation in the round; the user may override
single questions by label ("Q2: P2").

## Done

Every question is answered or accepted, the frontier is empty, and the user has confirmed
a one-paragraph summary of what was agreed.
