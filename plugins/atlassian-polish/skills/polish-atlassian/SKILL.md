---
name: polish-atlassian
description: Rewrites a Jira issue, an epic and its children, or a Confluence page into scannable, consistent content, keeping every decision, number, name, date and link. Use when the user says "polish this ticket", "make this Jira ticket readable", "clean up the epic description", "rewrite this Confluence page", "remove the prose from PROJ-123", or "make the ticket more attractive". Not for changing status, assignee, labels or fields.
argument-hint: <ISSUE-KEY | issue URL | Confluence page URL or ID> [--children] [--dry-run]
allowed-tools: Read, Write, Agent, Bash(command:*), Bash(rsvg-convert:*), Bash(magick:*), Bash(inkscape:*), Bash(curl -sS:*), Bash(jq:*), Bash(sips -g:*), mcp__claude_ai_Atlassian__getJiraIssue, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql, mcp__claude_ai_Atlassian__getJiraIssueRemoteIssueLinks, mcp__claude_ai_Atlassian__getConfluencePage, mcp__claude_ai_Atlassian__getConfluencePageDescendants, mcp__claude_ai_Atlassian__getConfluencePageFooterComments, mcp__claude_ai_Atlassian__getConfluencePageInlineComments, mcp__claude_ai_Atlassian__getContentFormatGuide, mcp__claude_ai_Atlassian__editJiraIssue, mcp__claude_ai_Atlassian__updateConfluencePage, mcp__atlassian__jira_get_issue, mcp__atlassian__jira_search, mcp__atlassian__jira_update_issue, mcp__atlassian__confluence_get_page, mcp__atlassian__confluence_get_page_children, mcp__atlassian__confluence_get_comments, mcp__atlassian__confluence_get_attachments, mcp__atlassian__confluence_update_page
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

- Jira: description, comments (all, with author + date), issue links, remote links, status,
  labels, attachments list.
- Epic + `--children`: search `parent = KEY`; if empty, retry `"Epic Link" = KEY`. Fetch each
  child the same way.
- Confluence: body (storage or ADF as returned), version number, footer + inline comments,
  attachments, labels. `--children` → descendants, each fetched the same way.

Comments often hold the current state; they outrank older description text.

### 4. Cross-check (optional — ask first)

If GitHub (`gh`, GitHub MCP) or Slack tools exist and the content links PRs or threads, ask:
"Check N linked PRs/threads to correct stale status?" On yes, read them only. Record each
finding with its date. Never post anything.

### 5. Back up

Before any write, save each original body verbatim with Write to
`${CLAUDE_PLUGIN_DATA}/backups/<YYYY-MM-DD>/<KEY-or-pageId>.<md|json|xml>` (extension = format
received). Tell the user the folder. Recovery: Jira issue History, Confluence page history.

### 6. Rewrite

Choose the output format per page from the decision table in
`${CLAUDE_PLUGIN_ROOT}/references/atlassian-formats.md` (Jira default: Markdown → ADF; keep
storage for Confluence pages with macros).

Launch `Agent` with `subagent_type: "atlassian-polish:atlassian-formatter"`, one call per page
(parallel for batches). Pass: target, output format, original body verbatim, comments,
metadata, cross-check findings, today's date. If the agent type is unavailable, read
`${CLAUDE_PLUGIN_ROOT}/agents/atlassian-formatter.md` and do the rewrite yourself following it.

Check the result: every ticket key, link, number and date from the input appears in BODY or
in REMOVED. Fix gaps before previewing.

### 7. Preview

Per page show: title + link, the full BODY, REMOVED, UNVERIFIED, NEEDS. Then ask:
"Write N page(s)? (yes / edit / no)". `edit` → apply the change, preview again.
`--dry-run` → stop here with "Dry run — nothing written. Backups: <folder>".

### 8. Write

Write each approved page with the format chosen in step 6:

- MCP edit/update tool by default. Confluence: send current version + 1; on 409 re-fetch,
  re-check the body is unchanged since backup, retry once.
- Inline Jira image, or any upload MCP can't do: ask REST consent now, listing the calls
  (`POST /rest/api/3/issue/{key}/attachments`, `PUT /rest/api/2/issue/{key}`, plus the
  replace calls below if an image exists). No → write without the embed and list it in the report.
- Diagram needed: follow `${CLAUDE_PLUGIN_ROOT}/references/diagrams.md` (SVG, 2× render,
  Read the PNG and fix until clean). Upload PNG and its SVG source with the same base name.
- First image embed (Jira): upload, then `PUT /rest/api/2/issue/{key}` with
  `!name.png|width=1200,alt=<what it shows>!`. Confluence: `ac:width="1200" ac:alt="…"`.
- Replacing an existing Jira image: never delete the old attachment first (wiki markup keeps
  the old media ID, so the embed breaks). Follow the ADF media-ID steps in formats §4 in order.
  Data Center: no media IDs; follow "Replacing an image (Data Center)" in formats §4.
- Confluence replace: upload a new version of the same attachment (formats §4).
- Any later wiki-markup rewrite of a page with an embedded image: re-check the media ID after
  the write (step 9); if it changed or broke, redo the ADF fix above.

### 9. Verify

Re-fetch every written page and check:

1. **Leftover markup:** scan the stored text for `{{`, `h2.` (any `hN.` at line start), `||`,
   `[text|url`, literal `**`, escaped `&lt;ac:`. Hit → fix and rewrite once, then re-verify.
2. **Images:** every ADF `media` node ID resolves to an attachment on the issue (compare with
   the attachment list and their content redirects). Confluence: every `ri:attachment`
   filename exists on the page. Broken or missing → "Not done" with the fix (ADF steps in 8).
3. **Links:** issue links written or described match what the issue has (no "blocks" left
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
