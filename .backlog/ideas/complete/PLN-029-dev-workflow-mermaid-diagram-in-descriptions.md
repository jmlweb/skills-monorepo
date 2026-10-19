---
id: PLN-029
title: dev-workflow: Mermaid diagram in descriptions of complex PRs
status: approved
created: 2026-10-18
complexity: low
reviewed: 2026-10-19
task-id: TSK-058
---

## Goal

The `dev-workflow:pr-writer` agent adds one Mermaid diagram to a PR description when the change is structurally complex. That means several interacting components, a new flow or state machine, or a new cross-package dependency. Small, mechanical or single-area PRs get no diagram. Both `/open-pr` and `/pr-ready` inherit the behavior, because both delegate the description to `pr-writer`.

## Context

- Reviewers of complex PRs reconstruct the flow from bullets and the diff. A picture of how the parts interact shortens that. GitHub renders fenced `mermaid` blocks in PR bodies.
- The writing rules live in `plugins/dev-workflow/references/pr-style-guide.md`. `plugins/dev-workflow/agents/pr-writer.md` (read-only, `tools: Read`) applies them. `open-pr` (step 4) and `pr-ready` (step 8) gather the inputs and call the agent.
- The agent already receives the commit log, diff stat and key hunks. These are enough to judge structural complexity without a new CLI command, so the zero-dependency invariant stays intact.
- Mermaid is already used in this repo's READMEs (`README.md`, `plugins/dev-workflow/README.md`, `plugins/flowstate/README.md`), so the syntax style has local precedent.
- Decisions agreed in grilling:
  - Surface: only `pr-writer`. `/review-pr` stays untouched.
  - Complexity: the agent judges it from criteria in the style guide. No CLI command.
  - Placement: a fenced block inside the template's "what changed / approach" section. No new template section.
  - Shape: at most one diagram, about 12 nodes or fewer, labelled by behavior and not by file. The type is a flowchart, sequence or state diagram, whichever fits.
  - Validation: safe-syntax rules, no dependency. The approve step in both skills is the human check.
  - Opt-out: no flag. The user's extra instructions to `pr-writer` already cover it.

## Approach

1. In `pr-style-guide.md`, add a `## Diagrams` section with four parts:
   - **When:** add a diagram only if the inputs show at least one of: three or more components or modules that call or feed each other; a new or changed multi-step flow, lifecycle or state machine; a new dependency across packages or services. Skip it for renames, dependency bumps, docs-only, test-only, config-only and single-function changes.
   - **Where:** inside the section that answers "what changed" or "approach" (`## What changed` in the built-in template). In a custom template, use the closest section of that kind. A template with no such section gets no diagram, because adding a section would break template semantics.
   - **Shape:** one fenced `mermaid` block. Use `flowchart`, `sequenceDiagram` or `stateDiagram-v2`. Use about 12 nodes or fewer. Labels name behaviors or components, not file paths. Show only what changed, or the minimum surrounding context needed to read it. One sentence before the block says what the diagram shows.
   - **Safe syntax:** put every node label in double quotes. Use no raw `()`, `:`, `;` or `#` outside quotes. Use simple alphanumeric node IDs. Leave out styling, `classDef` and click handlers.
2. Update the guide's self-check with two items: a diagram exists only when a "When" criterion holds, and the diagram follows the shape and safe-syntax rules. Reconcile "Things to leave out" so a diagram does not count as restating the diff.
3. In `pr-writer.md`, add a step under "How to write": decide whether a diagram applies, following the style guide's Diagrams section. The user's extra instructions can veto it, for example "no diagram".
4. Check the hunk gathering in `open-pr` step 4 and `pr-ready` step 8 ("a few key hunks"). If the diff stat alone cannot show component interactions, allow the skill to pass hunks from more files when the diff stat spans several areas. Keep the cap explicit.
5. Update the `/open-pr` section of `plugins/dev-workflow/README.md` with one line saying complex PRs get a Mermaid diagram of the change.
6. Run `pnpm lint:skills` and `claude plugin validate .`. Then do a manual sanity run: give `pr-writer` the inputs of a known complex branch, for example `feat/flowstate-kickstart`, and of a trivial one. Confirm that only the complex one gets a diagram and that the diagram renders in GitHub's preview.
7. Release as a minor bump of dev-workflow (`feat(dev-workflow): ...`) through the usual `pnpm bump` flow.

## Files to Modify

- `plugins/dev-workflow/references/pr-style-guide.md`: new `## Diagrams` section (when, where, shape, safe syntax); self-check and "Things to leave out" updated
- `plugins/dev-workflow/agents/pr-writer.md`: new "How to write" step for the diagram decision, with the user-instruction veto
- `plugins/dev-workflow/skills/open-pr/SKILL.md`: step 4 hunk gathering widened, only if step 4 of the Approach finds it necessary
- `plugins/dev-workflow/skills/pr-ready/SKILL.md`: step 8 hunk gathering, kept aligned with `open-pr`
- `plugins/dev-workflow/README.md`: one line in the `/open-pr` section

## Risks & Considerations

- **Hallucinated structure:** the agent sees only a few hunks, so it may draw interactions that do not exist. Mitigations: the style guide's "Stay factual" principle applies to diagrams too; only draw edges the inputs show; when in doubt, leave the diagram out.
- **Broken render:** a Mermaid syntax error shows as an error box on GitHub. The safe-syntax rules reduce it. The approve step lets the user catch it, but the terminal shows raw Mermaid and not the render.
- **Diagram creep:** a loose "When" rule turns diagrams into decoration on every PR. Keep the criteria strict, and test them in the sanity run with a trivial branch.
- **Non-GitHub hosts:** `gh` means the target is always GitHub, so rendering is guaranteed there. A future GitLab or Bitbucket path would need to revisit this.
- **Template semantics stay intact:** no new section is ever added, so existing repo and user templates behave as before.
