---
name: polish-atlassian
description: Rewrites a Jira issue, an epic and its children, or a Confluence page into scannable, consistent content, keeping every decision, number, name, date and link. Use when the user says "polish this ticket", "make this Jira ticket readable", "clean up the epic description", "rewrite this Confluence page", "remove the prose from PROJ-123", "make the ticket more attractive", or "audit this ticket's readability". Not for changing status, assignee, labels or fields.
argument-hint: <ISSUE-KEY | issue URL | Confluence page URL or ID> [--children] [--dry-run] [--audit] [--light]
allowed-tools: Read, Write, Agent, Bash(command:*), Bash(node:*), Bash(rsvg-convert:*), Bash(magick:*), Bash(inkscape:*), Bash(curl -sS:*), Bash(jq:*), Bash(sips -g:*), mcp__claude_ai_Atlassian__getJiraIssue, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql, mcp__claude_ai_Atlassian__getJiraIssueRemoteIssueLinks, mcp__claude_ai_Atlassian__getConfluencePage, mcp__claude_ai_Atlassian__getConfluencePageDescendants, mcp__claude_ai_Atlassian__getConfluencePageFooterComments, mcp__claude_ai_Atlassian__getConfluencePageInlineComments, mcp__claude_ai_Atlassian__getContentFormatGuide, mcp__claude_ai_Atlassian__lookupJiraAccountId, mcp__claude_ai_Atlassian__editJiraIssue, mcp__claude_ai_Atlassian__updateConfluencePage, mcp__atlassian__jira_get_issue, mcp__atlassian__jira_search, mcp__atlassian__jira_update_issue, mcp__atlassian__confluence_get_page, mcp__atlassian__confluence_get_page_children, mcp__atlassian__confluence_get_comments, mcp__atlassian__confluence_get_attachments, mcp__atlassian__confluence_update_page
model: sonnet
effort: medium
---

# Polish Atlassian

## Arguments

`$ARGUMENTS` — one target plus optional flags:

- Jira: `PROJ-123` or `https://<site>.atlassian.net/browse/PROJ-123`
- Confluence: page URL (`…/pages/<id>/…`) or numeric page ID
- `--children` — epic: include its child issues. Page: include its child pages
- `--dry-run` — stop after the preview
- `--audit` — readability analysis only (step 3a); nothing is backed up or written
- `--light` — keep section order, fix wording and format only. Default is `restructure`
  (reader-priority order, TL;DR callout, split grab-bag sections, checkbox acceptance
  criteria; skip checkboxes only if the user opts out)

No target → ask which issue or page to polish.

## Rules (apply in every step)

- **Approval gate.** Jira and Confluence are written only in step 8, after the user answers
  yes to the step 7 question. Every earlier step reads, backs up or previews.
- Only the body (description / page content) changes. Status, assignee, labels, fields,
  issue links and page hierarchy stay as fetched; link changes the user wants go in the
  report as manual steps.
- REST API calls use the user's stored API token: ask consent once per run, stating exactly
  which calls. The token is used inside the command and never printed.
- Batch (epic children, child pages): all previews first, then one approval, then write.

| Shortcut thought | Why it fails |
|------------------|--------------|
| "The change is tiny, write it without asking" | The body replaces the whole description; the preview is the only checkpoint |
| "The user said 'polish it', that's approval" | Approval is a yes to the step 7 question, after seeing the preview |

## Prerequisites

1. Find Atlassian MCP tools in the session (Jira get/search/edit, Confluence get/update).
   None → stop: "No Atlassian tools found. Run `/atlassian-polish:atlassian-setup` to connect
   your site, then rerun."
2. If a format-guide tool exists (e.g. `getContentFormatGuide`), call it once and follow it.

## Workflow

### 1. Resolve the target
Parse key, URL or ID. Jira URL → key after `/browse/` or `selectedIssue=`. Confluence URL →
numeric ID after `/pages/`. Done when: one line states the site and target.

### 2. Discover tools
Map each need to a tool: read body, read comments, read links, search children, write body,
upload attachment. Mark any need no MCP tool covers as "REST only"; REST consent comes later.
Done when: every need maps to a tool or is marked "REST only".

### 3. Fetch everything
- Jira: description (with `expand: renderedFields`), comments (all, with author + date), issue
  links, remote links, status, labels, attachments list. Then read
  `${CLAUDE_PLUGIN_ROOT}/references/jira-fetch.md` (lossy scan, round-trip, people map,
  blockers) and `${CLAUDE_PLUGIN_ROOT}/references/lossy-content.md` (lossy check, backup
  files).
- Epic + `--children`: search `parent = KEY`; if empty, retry `"Epic Link" = KEY`. Fetch each
  child the same way.
- Confluence: body (storage or ADF as returned), version number, footer + inline comments,
  attachments, labels. `--children` → descendants, each fetched the same way.

Comments often hold the current state; they outrank older description text.
Done when: each target has body, comments and metadata in hand, and every Jira issue has a
lossy-scan result.

### 3a. Audit (`--audit` only, then stop)
Read `${CLAUDE_PLUGIN_ROOT}/references/audit.md` and print its per-page analysis. No backup,
no agent call, no write.
Done when: the output ends with "Audit only — nothing written. Run without `--audit` to
apply."

### 4. Cross-check (optional — ask first)
If GitHub (`gh`, GitHub MCP) or Slack tools exist and the content links PRs or threads, ask:
"Check N linked PRs/threads to correct stale status?" On yes, read them only (the skill
posts nothing). Record each finding with its date.
Done when: the user answered, or no such tools or links exist.

### 5. Back up
Before any write, save each original body verbatim with Write under
`${CLAUDE_PLUGIN_DATA}/backups/<YYYY-MM-DD>/`. Confluence: `<pageId>.<json|xml>` (extension =
format received). Jira: `<KEY>.md` plus `<KEY>.rendered.html`, and `<KEY>.adf.json` with REST
consent (lossy-content.md rule 2: ask for it here, naming the GET). Recovery: Jira issue
History, Confluence page history.

Verbatim means the exact string the tool returned (Markdown and `renderedFields.description`),
however long or macro-heavy (lossy-content.md rule 3). An existing backup keeps its name; the
new one gets suffix `.2`, `.3`. A backup that cannot be written verbatim stops the run before
step 8, with that said.
Done when: every target has its backup file and the report names the folder and which of
the three Jira files exist.

### 6. Rewrite
Choose the output format per page from the decision table in
`${CLAUDE_PLUGIN_ROOT}/references/atlassian-formats.md` (Jira default: Markdown → ADF; keep
storage for Confluence pages with macros).

Launch `Agent` with `subagent_type: "atlassian-polish:atlassian-formatter"`, one call per page
(parallel for batches), passing the inputs and then running the result checks in
`${CLAUDE_PLUGIN_ROOT}/references/rewrite-and-preview.md`. If the agent type is unavailable, read
`${CLAUDE_PLUGIN_ROOT}/agents/atlassian-formatter.md` and do the rewrite yourself following it.
Done when: each page has BODY, REMOVED, CONFLICTS, UNVERIFIED and NEEDS, and the key, link,
number and date check passes.

### 7. Preview
Print the preview as laid out in `${CLAUDE_PLUGIN_ROOT}/references/rewrite-and-preview.md`
(lossy line first, then BODY, REMOVED, CONFLICTS, UNVERIFIED, NEEDS, notify list). Any
CONFLICTS → ask how to resolve each one before asking to write. Then ask:
"Write N page(s)? (yes / edit / no)". `edit` → apply the change, preview again.
`--dry-run` → stop here with "Dry run — nothing written. Backups: <folder>".
Done when: the user has answered yes or no, or `--dry-run` printed its stop line.

### 8. Write
On yes, read `${CLAUDE_PLUGIN_ROOT}/references/write-and-verify.md` and write each approved
page with the format chosen in step 6, following its write rules and REST preflight.
Done when: every approved page is written, or listed under "Not done" with the reason.

### 9. Verify
Re-fetch every written page and run the six checks in write-and-verify.md (leftover markup,
images, list spacing, ticket keys, mentions, links). Fix and rewrite once on a hit.
Done when: each check passed or its remainder is listed under "Not done".

### 10. Report
Print the confirmation block:

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
