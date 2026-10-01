# ✨ atlassian-polish

> A Claude Code plugin that rewrites Jira issues and Confluence pages so a human can read them at a glance — clear structure, only meaningful content, sparing formatting. Every decision, number, name, date and link survives.

## Installation

```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install atlassian-polish@jmlweb
```

---

## Commands

| Command | What it does |
|---------|--------------|
| `/atlassian-polish:atlassian-setup [url]` | Detects Cloud vs Data Center from any site URL, checks your MCP servers and tokens, and links the exact page to create credentials — run this first |
| `/atlassian-polish:polish-atlassian <target> [--children] [--dry-run]` | Fetches, backs up, rewrites, previews and (after your approval) writes a Jira issue, an epic and its children, or a Confluence page and its child pages |

```bash
/atlassian-polish:polish-atlassian PROJ-123
/atlassian-polish:polish-atlassian PROJ-100 --children            # epic + every child issue
/atlassian-polish:polish-atlassian https://acme.atlassian.net/wiki/spaces/ENG/pages/98765/Runbook --dry-run
```

Or just ask: *"polish this ticket"*, *"clean up the epic description"*, *"rewrite this Confluence page"*.

## What it does

- 🔍 Reads the body **and** the comments — the newest dated source wins, so stale status lines get corrected
- 🧹 Drops correction notes, "recreated from…" lines, restated context, superseded plans, filler and hedging
- 📋 Lays tickets out the same way every time: Goal · What/Rules · Decisions table · Done when · dated Status · Open questions · Links
- 🧭 Epics get a children table and a go-live checklist; Confluence pages keep their meaningful heading hierarchy
- 💾 Backs up every original before writing and shows you a preview plus a list of what was removed and why
- ✅ Re-fetches after writing and scans for leftover markup (`{{`, `h2.`, `||`, literal `**`…), broken images and mismatched issue links
- 🖼️ Diagrams are always added for complex problems, ticket/element relationships and concepts; rendered at 2× from SVG, visually self-checked, and the SVG source is attached beside the PNG; replaced images never break
- 🔗 Optionally cross-checks linked GitHub PRs and Slack threads (asks first, read-only)

## What it never does

- Change status, assignee, labels, fields or issue links
- Write anything without your approval (batches: one approval after all previews)
- Use the REST API / your API token without asking — only for what MCP can't do, like attachment uploads
- Translate your content or invent facts

## How it's built

| Piece | Role |
|-------|------|
| `skills/atlassian-setup` | Guided connection: deployment detection, MCP server, optional REST token |
| `skills/polish-atlassian` | Orchestrates fetch → backup → rewrite → preview → write → verify |
| `agents/atlassian-formatter` | Rewrites one page; knows ADF, Jira wiki markup, Confluence storage format and their traps |
| `src/` → `dist/bin/atlassian-polish.js` | `md-to-adf` CLI: Markdown → Jira ADF, so checklists become real checkboxes |
| `references/style-guide.md` | Keep/cut rules, templates, before/after examples |
| `references/atlassian-formats.md` | Format decision table, pitfalls, rendering limits, attachment and image-replace flow |
| `references/diagrams.md` | SVG hygiene, layout defaults, 2× render, self-check |
| `references/setup-auth.md` | Per-deployment auth commands, token pages, Keychain setup, troubleshooting |

One tiny CLI (`md-to-adf`), zero runtime dependencies; `dist/` is committed, so there is no build step for users.

## Requirements

- An Atlassian MCP server connected in Claude Code (Jira and/or Confluence) — `/atlassian-polish:atlassian-setup` walks you through it for Cloud (Rovo MCP, OAuth) and Data Center (`mcp-atlassian`, Personal Access Token)
- Optional: `gh` or a GitHub/Slack MCP for cross-checks; `rsvg-convert`, `magick` or `inkscape` for diagram PNGs

## License

MIT
