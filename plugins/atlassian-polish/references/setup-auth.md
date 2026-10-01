# Setup & Authentication

Read by `polish-setup`. Give the user only the section for their deployment. Every command
is run by the user in their own terminal; placeholders in `<angle brackets>`.

`-s user` makes the server available in every project (the default `local` scope only
covers the current directory).

Sources: Atlassian Rovo MCP guides (developer.atlassian.com/cloud/rovo-mcp), the
`sooperset/mcp-atlassian` README, `claude mcp add --help`.

---

## Cloud (`*.atlassian.net`)

### MCP — Rovo MCP server with OAuth (default)

Prerequisite: an Atlassian **org admin** has enabled the Rovo MCP server in the org's
security / access policies. Without it, sign-in fails even with a valid account.

```bash
claude mcp add -s user --transport http atlassian https://mcp.atlassian.com/v2/mcp
```

Then in Claude Code: `/mcp` → `atlassian` → authenticate (browser consent). No token to
manage. If you already use the claude.ai Atlassian connector, its tools work too — skip this.

The old `https://mcp.atlassian.com/v1/sse` endpoint is retired; replace it if found in
`claude mcp list`.

### MCP — API token instead of OAuth (headless, admin must allow it)

Use only if the org admin enabled API-token auth for the Rovo MCP server.

1. Create a token with the MCP scopes pre-selected:
   https://id.atlassian.com/manage-profile/security/api-tokens?autofillToken&expiryDays=max&appId=mcp-v2&selectedScopes=all
2. Build the header value and add the server (in your terminal):

   ```bash
   B64=$(printf '%s' '<email>:<token>' | base64)
   claude mcp add -s user --transport http atlassian https://mcp.atlassian.com/v2/mcp \
     -H "Authorization: Basic $B64"
   ```

3. Check: `curl -sI https://mcp.atlassian.com/v2/mcp -H "Authorization: Basic $B64"` → `200`.

The header is stored in Claude Code's MCP config file in plain text. OAuth avoids that.

### REST token (optional — attachments, inline images)

Token page: https://id.atlassian.com/manage-profile/security/api-tokens

- **Create API token** (classic, unscoped) → works with `https://<site>/rest/api/...` and
  Basic auth `email:token`. This is what `polish-atlassian` uses.
- **Create API token with scopes** → only works through the gateway
  `https://api.atlassian.com/ex/jira/<cloudId>/rest/api/3/...` (cloudId from setup step 2).
  Not used by this plugin.

---

## Data Center / Server (self-hosted)

Rovo MCP is Cloud-only. Use the community server `mcp-atlassian` (needs `uvx`, from `uv`:
https://docs.astral.sh/uv/).

### Personal Access Token (PAT)

Supported from Jira 8.14 and Confluence 7.9 (`mcp-atlassian` documents Confluence 6.0+, but
the PAT feature itself needs 7.9). Create one per product:

| Product | Token page |
|---------|------------|
| Jira | `<base>/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens` |
| Confluence | `<base>/plugins/personalaccesstokens/usertokens.action` |

Or: avatar → Profile → **Personal Access Tokens** → Create token. Set an expiry.

### MCP — `mcp-atlassian`

Include only the lines for the products the user has:

```bash
claude mcp add -s user atlassian \
  -e JIRA_URL=<jira-base> -e JIRA_PERSONAL_TOKEN=<jira-pat> \
  -e CONFLUENCE_URL=<confluence-base> -e CONFLUENCE_PERSONAL_TOKEN=<confluence-pat> \
  -- uvx mcp-atlassian
```

Self-signed certificates: add `-e JIRA_SSL_VERIFY=false` / `-e CONFLUENCE_SSL_VERIFY=false`
only if the user confirms their instance uses one. The PAT is stored in the MCP config file in
plain text.

### REST token

Reuse the PAT. `polish-atlassian` sends it as `Authorization: Bearer $ATLASSIAN_API_TOKEN`.

---

## Putting the REST token in the environment

Claude Code only sees env vars that exist when it starts. Pick one, then restart Claude Code.

**macOS Keychain (recommended — no plaintext file):**

```bash
security add-generic-password -a "$USER" -s atlassian-api-token -w   # prompts for the token
# ~/.zshrc
export ATLASSIAN_API_TOKEN="$(security find-generic-password -a "$USER" -s atlassian-api-token -w)"
export ATLASSIAN_EMAIL="<email>"      # Cloud only
```

**Shell profile (any OS):** add both `export` lines with the literal token to `~/.zshrc` /
`~/.bashrc`, and `chmod 600` the file.

Don't put tokens in a repo's `.env`, in `settings.json` `env`, or in chat.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `/mcp` sign-in fails, Cloud | Rovo MCP not enabled by org admin |
| `401` on REST | wrong email, expired/revoked token, scoped token used on site URL |
| `403` on REST, Data Center | basic auth disabled by SSO → use PAT with Bearer (already the default here) |
| `404` on REST | wrong base URL or missing context path (`/jira`, `/confluence`) |
| MCP tools missing after `claude mcp add` | restart Claude Code, or `/mcp` → reconnect |
| `uvx: command not found` | install `uv` first |
