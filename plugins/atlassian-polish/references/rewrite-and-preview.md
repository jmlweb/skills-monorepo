# Rewrite and preview details (polish-atlassian steps 6 and 7)

## Inputs to the formatter agent

Pass: target, output format, original body verbatim, comments, metadata (incl. issue links,
sub-tasks), blockers, cross-check findings, today's date, people map, depth
(`restructure` | `light`) and any opt-out the user stated. Add no format restrictions of your
own (e.g. `- [ ]` stays allowed).

## Result checks

- If the content meets a diagram trigger (complex problem, ticket/element relationships,
  concept; `diagrams.md` §0) and BODY has no diagram and NEEDS has no `DIAGRAM:` line, send
  it back.
- Every ticket key, link, number and date from the input appears in BODY or in REMOVED.
  Fix gaps before previewing.

## Preview layout (step 7)

- Header line per page: title + link + `depth: restructure|light`.
- Any `LOSSY:` line comes first, with the chosen option (preserve / skip / flatten) and, for
  flatten, the question that needs a yes before the write question.
- Then the full BODY, REMOVED (incl. moves), CONFLICTS, UNVERIFIED, NEEDS (incl. planned
  diagrams), and "Will notify: <names>" when BODY has mentions (writing them notifies those
  people).
- Each CONFLICT gets the formatter's suggested fix as the offered resolution.
