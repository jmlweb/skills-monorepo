# Write and verify details (polish-atlassian steps 8 and 9)

Read after the user has approved the write in step 7. The approval covers the MCP writes
below; REST calls need their own consent (REST preflight).

## Write rules

- MCP edit/update tool by default. Confluence: send current version + 1; on 409 re-fetch,
  re-check the body is unchanged since backup, retry once.
- Inline Jira image, or any upload MCP can't do: ask REST consent now, listing the calls
  (`POST /rest/api/3/issue/{key}/attachments`, `PUT /rest/api/2/issue/{key}`, plus the
  replace calls below if an image exists). On no, write without the embed and list it in the
  report.
- Jira body: always convert the whole body with
  `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/atlassian-polish.js" md-to-adf` (formats §1 "ADF
  checklist") and send the JSON via `editJiraIssue` `contentFormat: "adf"`. Markdown drops
  smart links, mentions and checkboxes, so a Jira description always goes as ADF.
  Always add `--jira-base <site URL> --projects <prefixes>`: site from the target, prefixes
  from every `data-jira-key` in the fetched HTML plus the issue's own project. Without them
  every ticket key is written as plain text.
  A broken `[ ]` is fixed in the write itself; plain bullets are not an acceptable cover.
- Diagram in NEEDS (`DIAGRAM:` line): always draw it, per
  `${CLAUDE_PLUGIN_ROOT}/references/diagrams.md` (SVG, 2× render, Read the PNG and fix until
  clean). Upload PNG and its SVG source with the same base name.
- First image embed (Jira): upload, then `PUT /rest/api/2/issue/{key}` with
  `!name.png|width=1200,alt=<what it shows>!`. Confluence: `ac:width="1200" ac:alt="…"`.
- Replacing an existing Jira image: keep the old attachment in place and follow the ADF
  media-ID steps in formats §4 in order (deleting it first breaks the embed, because wiki
  markup keeps the old media ID).
  Data Center: no media IDs; follow "Replacing an image (Data Center)" in formats §4.
- Confluence replace: upload a new version of the same attachment (formats §4).
- Any later wiki-markup rewrite of a page with an embedded image: re-check the media ID after
  the write (step 9); if it changed or broke, redo the ADF fix above.

## REST preflight (before the first REST call, once per run)

After consent, run `curl -sS -o /dev/null -w "%{http_code}"` on `GET <base>/rest/api/3/myself`
(Data Center: `/rest/api/2/myself` with Bearer). `200` → go on. `401` → stop REST: "Your
ATLASSIAN_API_TOKEN / ATLASSIAN_EMAIL were rejected (401). Re-run
`/atlassian-polish:atlassian-setup` to create and verify a classic token." `403` → "The token
authenticates but lacks access to this issue."

On `401`, if `claude mcp get atlassian` shows the community `mcp-atlassian` server (user scope,
token in its `env`), offer once: "Use the credentials from your MCP server config for this run
only? They are read from `~/.claude.json`, never printed or copied. (yes / no)". Yes → repeat
the preflight with them and, if `200`, use them for every REST call this run:

```bash
J='.mcpServers.atlassian.env'
curl -sS -o /dev/null -w "%{http_code}" \
  -u "$(jq -r "$J | (.JIRA_USERNAME // .CONFLUENCE_USERNAME)" ~/.claude.json):$(jq -r "$J | (.JIRA_API_TOKEN // .CONFLUENCE_API_TOKEN)" ~/.claude.json)" \
  "<base>/rest/api/3/myself"
```

Shell state doesn't persist, so repeat the substitution in each REST call. The value stays
inside the command substitution: it is not echoed, written to a file or exported as
`ATLASSIAN_*`. No / not `200` / no such server (Rovo OAuth has no token) → write without REST
and list it under "Not done". Say in the report that the fallback was used, and that
`ATLASSIAN_*` still needs fixing via `atlassian-setup`. These are the only credentials used.

## Verify checks (step 9)

Re-fetch every written page and check:

1. **Leftover markup:** scan the stored text for literal `\[ \]` / `\[x\]` (checkbox stored as
   text → rewrite as ADF `taskList`), `{{`, `h2.` (any `hN.` at line start), `||`,
   `[text|url`, literal `**`, escaped `&lt;ac:`. Hit → fix and rewrite once, then re-verify.
2. **Images:** every ADF `media` node ID resolves to an attachment on the issue (compare with
   the attachment list and their content redirects). Confluence: every `ri:attachment`
   filename exists on the page. Broken or missing → "Not done" with the fix (ADF steps in
   Write rules).
3. **List spacing:** check `renderedFields.description` (HTML), because the Markdown readback
   always shows blank/whitespace lines around nested lists, even for clean ADF. Hit = empty
   `<li>`/`<p>` or a nested list split into separate `<ul>`s → rewrite via `md-to-adf` +
   `contentFormat: "adf"`, or report it.
4. **Ticket keys:** count `<custom data-type="smartlink">` tags in the write's Markdown
   readback vs keys in BODY outside code; any gap → re-convert with the missing prefix.
   Count against the Markdown readback only: `renderedFields` auto-links plain-text keys.
5. **Mentions:** every `mention:` in BODY came back as a mention (Markdown readback shows
   it as a mention, not `[@Name](mention:…)` text).
6. **Links:** issue links written or described match what the issue has (no "blocks" left
   beside a "relates to" for the same pair). Changes the tools can't make → "Not done" as
   manual steps.
