---
name: polish-atlassian
description: Rewrites a Jira issue, an epic and its children, or a Confluence page into scannable, consistent content, keeping every decision, number, name, date and link. Use when the user says "polish this ticket", "make this Jira ticket readable", "clean up the epic description", "rewrite this Confluence page", "remove the prose from PROJ-123", "make the ticket more attractive", or "audit this ticket's readability". Not for changing status, assignee, labels or fields.
argument-hint: <ISSUE-KEY | issue URL | Confluence page URL or ID> [--children] [--dry-run] [--audit] [--light]
allowed-tools: Read, Write, Agent, Bash(command:*), Bash(node:*), Bash(rsvg-convert:*), Bash(magick:*), Bash(inkscape:*), Bash(curl -sS:*), Bash(jq:*), Bash(sips -g:*), mcp__claude_ai_Atlassian__getJiraIssue, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql, mcp__claude_ai_Atlassian__getJiraIssueRemoteIssueLinks, mcp__claude_ai_Atlassian__getConfluencePage, mcp__claude_ai_Atlassian__getConfluencePageDescendants, mcp__claude_ai_Atlassian__getConfluencePageFooterComments, mcp__claude_ai_Atlassian__getConfluencePageInlineComments, mcp__claude_ai_Atlassian__getContentFormatGuide, mcp__claude_ai_Atlassian__lookupJiraAccountId, mcp__claude_ai_Atlassian__editJiraIssue, mcp__claude_ai_Atlassian__updateConfluencePage, mcp__atlassian__jira_get_issue, mcp__atlassian__jira_search, mcp__atlassian__jira_update_issue, mcp__atlassian__confluence_get_page, mcp__atlassian__confluence_get_page_children, mcp__atlassian__confluence_get_comments, mcp__atlassian__confluence_get_attachments, mcp__atlassian__confluence_update_page
model: sonnet
effort: medium
---

# Polish Atlassian

Rewrite Jira and Confluence content so a human reads it at a glance. Facts stay; padding goes.
Nothing is written without the user's approval.

## Arguments

`$ARGUMENTS` — one target plus optional flags:

- Jira: `PROJ-123` or `https://<site>.atlassian.net/browse/PROJ-123`
- Confluence: page URL (`…/pages/<id>/…`) or numeric page ID
- `--children` — epic: include its child issues. Page: include its child pages
- `--dry-run` — stop after the preview
- `--audit` — readability analysis only (step 3a); nothing is backed up or written
- `--light` — light rewrite: keep section order, fix wording and format only. Default is
  `restructure` (reader-priority order, TL;DR callout, split grab-bag sections, checkbox
  acceptance criteria). Checkboxes are on by default; skip them only if the user opts out

No target → ask for one. Never guess.

## Rules (apply in every step)

- Only the body (description / page content) changes. Never touch status, assignee, labels,
  fields, issue links or page hierarchy. Link changes the user wants go in the report as
  manual steps.
- REST API calls use the user's stored API token: only after explicit consent, once per run,
  stating exactly which calls. Never print the token.
- Batch (epic children, child pages): all previews first, then one approval, then write.
- Never invent facts. Unverifiable → keep and mark `(unverified)`.

## Prerequisites

1. Find Atlassian MCP tools in the session (Jira get/search/edit, Confluence get/update).
   None → stop: "No Atlassian tools found. Run `/atlassian-polish:atlassian-setup` to connect
   your site, then rerun."
2. If a format-guide tool exists (e.g. `getContentFormatGuide`), call it once and follow it.

## Workflow

### 1. Resolve the target

Parse key, URL or ID. Jira URL → key after `/browse/` or `selectedIssue=`. Confluence URL →
numeric ID after `/pages/`. Confirm site and target in one line.

### 2. Discover tools

Map each need to a tool: read body, read comments, read links, search children, write body,
upload attachment. Mark any need no MCP tool covers as "REST only" — don't ask consent yet.

### 3. Fetch everything

- Jira: description (with `expand: renderedFields`), comments (all, with author + date), issue
  links, remote links, status, labels, attachments list. Then follow
  `${CLAUDE_PLUGIN_ROOT}/references/lossy-content.md` (lossy check, backup files).
- Epic + `--children`: search `parent = KEY`; if empty, retry `"Epic Link" = KEY`. Fetch each
  child the same way.
- Confluence: body (storage or ADF as returned), version number, footer + inline comments,
  attachments, labels. `--children` → descendants, each fetched the same way.

Comments often hold the current state; they outrank older description text.

Round-trip (Jira): if the Markdown holds `<custom data-type=…>` tags (smart links,
mentions; the issue then reports `descriptionEditable: false`), save both strings to temp
files and run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/atlassian-polish.js" readback-to-md
--file <md> --html <rendered.html>`. Its output (bare keys, `[@Name](mention:<id>)`) is the
body the formatter gets; existing mentions go into the people map as is. Exit 2 → stop and
report the message; never hand-edit the tags.

People (Jira): for each other person named in the body, look up the account ID
(`lookupJiraAccountId`). Exactly one active match whose display name equals the name →
people map. One match by email/handle only (display name differs) → ask the user to
confirm before mapping. Otherwise keep the plain name. No lookup tool → no mentions.

Blockers (Jira): collect "is blocked by" issue links and any "blocked by" in comments; pass
them to the formatter as blockers.

### 3a. Audit (`--audit` only, then stop)

Read `${CLAUDE_PLUGIN_ROOT}/references/style-guide.md` and formats §5 "Making it engaging
without noise". Per page print: what works; problems ranked by reader impact (buried
headline, hidden blocker, contradictions, grab-bag sections, plain-bullet criteria);
Markdown/ADF options that fit; emoji recommendation (usually none, ⚠️ for a blocker);
proposed outline in reader-priority order. End with "Audit only — nothing written. Run
without `--audit` to apply." No backup, no agent call, no write.

### 4. Cross-check (optional — ask first)

If GitHub (`gh`, GitHub MCP) or Slack tools exist and the content links PRs or threads, ask:
"Check N linked PRs/threads to correct stale status?" On yes, read them only. Record each
finding with its date. Never post anything.

### 5. Back up

Before any write, save each original body verbatim with Write under
`${CLAUDE_PLUGIN_DATA}/backups/<YYYY-MM-DD>/`. Confluence: `<pageId>.<json|xml>` (extension =
format received). Jira: `<KEY>.md` plus `<KEY>.rendered.html`, and `<KEY>.adf.json` with REST
consent (lossy-content.md rule 2); report which exist. Tell the user the folder. Recovery: Jira
issue History, Confluence page history.

Hard rule: verbatim means the exact string the tool returned (Markdown and
`renderedFields.description`). Never summarize, truncate or condense it, however long or
macro-heavy (lossy-content.md rule 3). Never overwrite an existing backup; suffix `.2`, `.3`.
Can't write it verbatim → stop before step 8 and say so.

### 6. Rewrite

Choose the output format per page from the decision table in
`${CLAUDE_PLUGIN_ROOT}/references/atlassian-formats.md` (Jira default: Markdown → ADF; keep
storage for Confluence pages with macros).

Launch `Agent` with `subagent_type: "atlassian-polish:atlassian-formatter"`, one call per page
(parallel for batches). Pass: target, output format, original body verbatim, comments,
metadata (incl. issue links, sub-tasks), blockers, cross-check findings, today's date,
people map, depth (`restructure` | `light`) and any
opt-out the user stated. Don't add format restrictions of your own (e.g. "no `- [ ]`"). If the agent type is unavailable, read
`${CLAUDE_PLUGIN_ROOT}/agents/atlassian-formatter.md` and do the rewrite yourself following it.

Check the result: if the content meets a diagram trigger (complex problem, ticket/element
relationships, concept; `references/diagrams.md` §0) and BODY has no diagram and NEEDS has no
`DIAGRAM:` line, send it back. Then every ticket key, link, number and date from the input appears in BODY or
in REMOVED. Fix gaps before previewing.

### 7. Preview

Header line per page: title + link + `depth: restructure|light`. Then the full BODY, REMOVED
(incl. moves), CONFLICTS, UNVERIFIED, NEEDS (incl. planned diagrams), and "Will notify:
<names>" when BODY has mentions (writing them notifies those people). Any CONFLICTS → ask how
to resolve each one (offer the suggested fix) before asking to write. Then ask:
"Write N page(s)? (yes / edit / no)". `edit` → apply the change, preview again.
`--dry-run` → stop here with "Dry run — nothing written. Backups: <folder>".

### 8. Write

Write each approved page with the format chosen in step 6:

- MCP edit/update tool by default. Confluence: send current version + 1; on 409 re-fetch,
  re-check the body is unchanged since backup, retry once.
- Inline Jira image, or any upload MCP can't do: ask REST consent now, listing the calls
  (`POST /rest/api/3/issue/{key}/attachments`, `PUT /rest/api/2/issue/{key}`, plus the
  replace calls below if an image exists). No → write without the embed and list it in the report.
- Jira body: always convert the whole body with
  `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/atlassian-polish.js" md-to-adf` (formats §1 "ADF
  checklist") and send the JSON via `editJiraIssue` `contentFormat: "adf"`, never as Markdown.
  Always add `--jira-base <site URL> --projects <prefixes>`: site from the target, prefixes
  from every `data-jira-key` in the fetched HTML plus the issue's own project. Without them
  every ticket key is written as plain text.
  Never fall back to plain bullets to hide a broken `[ ]`; fix the write. Never send a
  Jira description as Markdown: it drops smart links, mentions and checkboxes.
- Diagram in NEEDS (`DIAGRAM:` line): always draw it, per `${CLAUDE_PLUGIN_ROOT}/references/diagrams.md` (SVG, 2× render,
  Read the PNG and fix until clean). Upload PNG and its SVG source with the same base name.
- First image embed (Jira): upload, then `PUT /rest/api/2/issue/{key}` with
  `!name.png|width=1200,alt=<what it shows>!`. Confluence: `ac:width="1200" ac:alt="…"`.
- Replacing an existing Jira image: never delete the old attachment first (wiki markup keeps
  the old media ID, so the embed breaks). Follow the ADF media-ID steps in formats §4 in order.
  Data Center: no media IDs; follow "Replacing an image (Data Center)" in formats §4.
- Confluence replace: upload a new version of the same attachment (formats §4).
- Any later wiki-markup rewrite of a page with an embedded image: re-check the media ID after
  the write (step 9); if it changed or broke, redo the ADF fix above.

### REST preflight (before the first REST call, once per run)

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

Shell state doesn't persist, so repeat the substitution in each REST call; never `echo` it,
never write it to a file or `ATLASSIAN_*`. No / not `200` / no such server (Rovo OAuth has no
token) → write without REST and list it under "Not done". Say in the report that the fallback
was used, and that `ATLASSIAN_*` still needs fixing via `atlassian-setup`. No other credentials.

### 9. Verify

Re-fetch every written page and check:

1. **Leftover markup:** scan the stored text for literal `\[ \]` / `\[x\]` (checkbox stored as
   text → rewrite as ADF `taskList`), `{{`, `h2.` (any `hN.` at line start), `||`,
   `[text|url`, literal `**`, escaped `&lt;ac:`. Hit → fix and rewrite once, then re-verify.
2. **Images:** every ADF `media` node ID resolves to an attachment on the issue (compare with
   the attachment list and their content redirects). Confluence: every `ri:attachment`
   filename exists on the page. Broken or missing → "Not done" with the fix (ADF steps in 8).
3. **List spacing:** check `renderedFields.description` (HTML), never the MCP Markdown: the
   Markdown readback always shows blank/whitespace lines around nested lists, even for clean
   ADF. Hit = empty `<li>`/`<p>` or a nested list split into separate `<ul>`s → rewrite via
   `md-to-adf` + `contentFormat: "adf"`, or report it.
4. **Ticket keys:** count `<custom data-type="smartlink">` tags in the write's Markdown
   readback vs keys in BODY outside code; any gap → re-convert with the missing prefix.
   Never use `renderedFields` for this: it auto-links plain-text keys.
5. **Mentions:** every `mention:` in BODY came back as a mention (Markdown readback shows
   it as a mention, not `[@Name](mention:…)` text).
6. **Links:** issue links written or described match what the issue has (no "blocks" left
   beside a "relates to" for the same pair). Changes the tools can't make → "Not done" as
   manual steps.

Report what still remains.

### 10. Report

Print the confirmation block below.

## Confirmation

```
Polished <N> page(s)            backups: <folder>
- PROJ-123  goal + decisions table, removed 3 stale notes   <link>
- PROJ-124  status refreshed from PR #510                   <link>
- Page 98765 kept headings, added TOC, 1 macro left as-is   <link>
Not done:
- PROJ-123  inline diagram — REST declined (attachment needs manual embed)
- PROJ-124  remove link to PROJ-9 — manual step
- PROJ-125  image broken (media ID not on issue) — re-run ADF media fix
```

One line per page. "Not done" lists every skipped action, unverified fact and manual step.
