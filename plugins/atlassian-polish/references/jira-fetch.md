# Jira fetch details (polish-atlassian step 3)

Read when the target is a Jira issue or epic. Confluence targets skip this file.

## Lossy scan

Run `lossy-scan` as in `lossy-content.md` rule 4 on every fetched issue, after the round-trip
below and again with `--adf` once the step 5 ADF backup exists. Exit 1 means findings: carry
them into the preview as `LOSSY:` and apply rule 5 (preserve, skip, or flatten with an
explicit named yes). Lossy nodes reach the formatter only through those options, never as
plain text.

## Round-trip

If the Markdown holds `<custom data-type=…>` tags (smart links, mentions; the issue then
reports `descriptionEditable: false`), save both strings to temp files and run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/atlassian-polish.js" readback-to-md --file <md> --html <rendered.html>
```

Its output (bare keys, `[@Name](mention:<id>)`) is the body the formatter gets; existing
mentions go into the people map as is. Exit 2 means the tags could not be converted: stop and
report the message (the CLI owns that conversion, so the tags are not edited by hand).

## People

For each other person named in the body, look up the account ID (`lookupJiraAccountId`):

- Exactly one active match whose display name equals the name: add to the people map.
- One match by email/handle only (display name differs): ask the user to confirm before
  mapping.
- Otherwise keep the plain name.
- No lookup tool: no mentions.

## Blockers

Collect "is blocked by" issue links and any "blocked by" in comments; pass them to the
formatter as blockers.
