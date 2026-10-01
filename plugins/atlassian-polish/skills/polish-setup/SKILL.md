---
name: polish-setup
description: Guides connecting Claude Code to a Jira or Confluence site for atlassian-polish — detects Cloud vs Data Center from a URL, checks existing MCP servers and tokens, and links the exact page to create credentials. Use when the user says "set up atlassian-polish", "connect Jira", "configure Confluence access", "polish-setup", or when polish-atlassian finds no Atlassian tools. Never asks for or stores a token in chat.
argument-hint: [Jira or Confluence URL]
allowed-tools: Read, Bash(claude mcp list:*), Bash(claude mcp get:*), Bash(command -v:*), Bash(test:*)
model: haiku
---

# Polish Setup

Get one Atlassian site working with `polish-atlassian`: an MCP server for read/write, plus an
optional REST token for what MCP can't do (attachments). Re-runnable; changes nothing on its
own — every command that edits config is run by the user or after their explicit yes.

## Arguments

`$ARGUMENTS` — any URL from the site (issue, board, page, space). Missing → ask:
"Paste any Jira or Confluence URL from the site you want to polish."

## Rules

- Never ask the user to paste a token, password or email+token into chat. Tokens go into
  commands the user runs **in their own terminal**, or into their shell profile.
- Probes in step 2 are unauthenticated GETs. Say so before running them.
- Never print an env var's value — only whether it is set.

## Workflow

### 1. Normalize the URL

- `https://<x>.atlassian.net/...` → base `https://<x>.atlassian.net` (Confluence lives at `/wiki`).
- Anything else → origin plus context path if the path starts with a segment before
  `/browse/`, `/display/`, `/spaces/`, `/pages/`, `/secure/` (e.g. `https://host/jira`).

### 2. Detect deployment and product

Tell the user: "Checking the site with two anonymous requests (no credentials)."

```bash
curl -sS -m 10 "<origin>/_edge/tenant_info"                # 200 + cloudId → Cloud
curl -sS -m 10 "<base>/rest/applinks/1.0/manifest"         # Data Center: <typeId>, <version>
```

- `cloudId` returned → **Cloud**. Keep the cloudId.
- Else manifest `<typeId>jira</typeId>` or `confluence` with `<version>` → **Data Center/Server**.
- Neither (VPN, SSO wall, timeout) → ask: "Is this Atlassian Cloud (`*.atlassian.net`) or
  self-hosted Data Center?" Continue with the answer.

### 3. Check what already works

- Atlassian MCP tools in this session (names containing `atlassian`, `jira`, `confluence`)?
- `claude mcp list` → any Atlassian server and its status (`✔ Connected`,
  `! Needs authentication`, `✘ Failed to connect`).
- REST env vars: `test -n "$ATLASSIAN_API_TOKEN" && echo set || echo unset`, same for
  `ATLASSIAN_EMAIL` (Cloud only).

Connected tools and env vars set → skip to step 6.
`! Needs authentication` → tell the user to run `/mcp`, pick the server, sign in. Then step 6.

### 4. Connect an MCP server

Read `${CLAUDE_PLUGIN_ROOT}/references/setup-auth.md` and give the user **only** the section
for the detected deployment:

- **Cloud** → Rovo MCP with OAuth (default), or API-token headers if their admin disabled
  OAuth for agents. Prerequisite: an org admin has enabled the Rovo MCP server.
- **Data Center** → community `mcp-atlassian` with a Personal Access Token. Give the PAT page
  for the detected product (Jira and/or Confluence), filled with their base URL.

Show the command with placeholders (`<PAT>`, `<email>`). Say: "Run this in a separate
terminal, not here, so the token stays out of the transcript." Then: "Restart Claude Code
(or run `/mcp` → reconnect) and run `/atlassian-polish:polish-setup` again to verify."

### 5. REST token (optional — for attachments and inline images)

Ask: "Set up a REST token too? Only needed to upload attachments. (yes / skip)".
On yes, give the REST section of the reference for the deployment, including the
macOS Keychain variant. Remind: env vars must exist before Claude Code starts.

### 6. Verify

- MCP: call one read tool (e.g. current user or a search with limit 1). Success → ✔.
- REST, only if the env vars are set and the user agrees ("Test the REST token with one
  read-only call to `/myself`?"):

  ```bash
  # Cloud
  curl -sS -o /dev/null -w "%{http_code}\n" -u "$ATLASSIAN_EMAIL:$ATLASSIAN_API_TOKEN" "<base>/rest/api/3/myself"
  # Data Center
  curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ATLASSIAN_API_TOKEN" "<base>/rest/api/2/myself"
  ```

  `200` ✔ · `401` wrong email/token or expired · `403` token lacks access or basic auth is
  disabled (SSO) · `404` wrong base URL / context path.

### 7. Report

Print the confirmation block below.

## Confirmation

```
Site:        <base>  (<Cloud | Data Center vX.Y>, <Jira | Confluence | both>)
MCP:         ✔ <server name> connected  |  ✘ not yet — run the command from step 4
REST token:  ✔ verified (200)  |  – skipped  |  ✘ <code>: <meaning>
Next:        /atlassian-polish:polish-atlassian <ISSUE-KEY> --dry-run
```
