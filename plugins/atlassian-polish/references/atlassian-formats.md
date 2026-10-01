# Atlassian Content Formats

What each format is, when to write it, and how it breaks. Read before choosing a write path.

## Decision table

| Target | Content needs | Write with | Format |
|--------|---------------|------------|--------|
| Jira issue | headings, lists, tables, code, links | MCP edit tool | Markdown → ADF (tool converts) |
| Jira issue | inline image of an attachment | REST v2, after consent | Jira wiki markup |
| Confluence page | no macros in the page | MCP update tool | Markdown (or ADF) |
| Confluence page | panels, TOC, status, images, any `ac:` macro | MCP update tool if it accepts storage, else REST after consent | Storage format |

Rule: never round-trip a page through a format that drops features it already uses. If the only
available write path would lose a macro, image or mention, stop and report it.

If the tool set exposes a format guide (e.g. `getContentFormatGuide`), call it once before the
first write: it states exactly what that MCP server accepts.

---

## 1. Jira ADF (Atlassian Document Format)

JSON tree (`doc` → `paragraph`, `heading`, `bulletList`, `table`, `codeBlock`, `panel`…).
This is what Jira Cloud stores and what REST v3 returns.

- **Use:** default for Jira. MCP tools usually accept Markdown and convert it to ADF.
- **Conversion handles:** headings, bullet/numbered lists, task lists (sometimes), tables,
  fenced code, inline code, links, bold/italic, strikethrough.
- **Conversion fails at:**
  - Inline images: Markdown `![](file.png)` does not become an ADF `mediaSingle`. Needs wiki
    markup via REST v2 (section 2) or the Jira UI.
  - Panels: Markdown has no panel syntax. Use a blockquote or a bold lead line instead.
  - Mentions: `@name` stays plain text. Keep the person's display name; don't fake a mention.
  - Nested tables and cell-level lists: flattened or dropped. Keep cells to one line.
- **Reading:** MCP may return Markdown, ADF JSON or rendered HTML. Back up whatever arrives,
  verbatim.

## 2. Jira wiki markup (REST API v2)

Legacy text syntax. `PUT /rest/api/2/issue/{key}` with `{"fields":{"description":"…"}}`
accepts it and Jira converts it to ADF on save.

- **Use:** only when an attachment must be embedded inline: `!diagram.png|width=1200!`.
  Upload the attachment first (section 4).
- **Syntax:** `h2. Title`, `* item`, `# item`, `||head||head||`, `|cell|cell|`,
  `{{monospace}}`, `[text|https://url]`, `{code:java}…{code}`, `{noformat}…{noformat}`,
  `{panel:title=Note}…{panel}`, `{info}…{info}`.

### Pitfalls (each one silently corrupts output)

| Input | Becomes | Fix |
|-------|---------|-----|
| `{ "a": 1 }` in prose | broken macro, text vanishes | wrap in `{noformat}`/`{code}`, or rephrase |
| `my_var_name`, `a*b*c`, `x^2^`, `+tag+`, `-flag-`, `~sub~` | italics, bold, superscript, underline, strike, subscript | put identifiers in `{{monospace}}` |
| `\|` inside a table cell | extra column, table breaks | rephrase ("or"), or escape as `\|` |
| `[` in prose | link parser starts | escape `\[` or rephrase |
| `!wow!` (paired `!`) | image tag | escape `\!` or rephrase |
| line starting with `-`, `*` or `#` | list item | only where a list is intended |
| `--` / `---` | en dash / em dash | `{{--flag}}` for CLI flags |

- Escaping with `\` works for most single characters, but inside `{{…}}` some still parse.
  Rephrasing is safer than escaping.
- Curly braces inside `{code}` blocks are safe. Everywhere else they are not.

## 3. Confluence: storage format vs ADF

Two editors, two stores:

- **Legacy/storage pages:** XHTML with `ac:` (macros) and `ri:` (resource identifiers).
  `GET /wiki/rest/api/content/{id}?expand=body.storage,version`.
- **New editor pages:** ADF, like Jira. Some MCP tools still read and write them as storage
  or Markdown and convert.

Storage snippets:

```xml
<ac:structured-macro ac:name="info"><ac:rich-text-body><p>…</p></ac:rich-text-body></ac:structured-macro>
<ac:structured-macro ac:name="toc"/>
<ac:image ac:width="1200"><ri:attachment ri:filename="diagram.png"/></ac:image>
<ac:link><ri:page ri:content-title="Other page"/></ac:link>
<ac:task-list><ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>…</ac:task-body></ac:task></ac:task-list>
```

Panel macro names: `info`, `note`, `warning`, `tip`.

- **Update rule:** body must be sent with `version.number` = current + 1, and the current
  title. A stale number returns 409: re-fetch and retry once, never force.
- **Images:** upload the attachment first, then reference it with
  `<ac:image><ri:attachment ri:filename="…"/></ac:image>`.
- **Fails at:** Markdown conversion drops unknown macros (Jira issue macro, page properties,
  excerpts, includes). If the page has any, write storage, or leave those sections untouched.
- XHTML must be well-formed: close every tag, escape `&` as `&amp;`, `<` as `&lt;`.

## 4. Attachments

- **Jira:** Atlassian MCP tools usually cannot upload. Fallback, only after the user consents
  to REST with their stored API token:

  ```bash
  curl -sS -u "$ATLASSIAN_EMAIL:$ATLASSIAN_API_TOKEN" \
    -H "X-Atlassian-Token: no-check" \
    -F "file=@diagram.png" \
    "https://<site>.atlassian.net/rest/api/3/issue/<KEY>/attachments"
  ```

  Data Center: replace `-u …` with `-H "Authorization: Bearer $ATLASSIAN_API_TOKEN"` (PAT) and
  use `/rest/api/2/issue/<KEY>/attachments`.
  Without `X-Atlassian-Token: no-check` the request fails XSRF checks (403).
- **Confluence:** some MCP servers have an upload tool (e.g. `confluence_upload_attachment`).
  Otherwise `POST /wiki/rest/api/content/{id}/child/attachment` with the same header.
- Never print or log the token. Read it from an env var the user already has set; if none
  exists, point them to `/atlassian-polish:polish-setup` — never ask them to paste it into chat.

## 5. Rendering limits

| Element | Limit | Rule |
|---------|-------|------|
| Code block / ASCII diagram | scrolls horizontally past ~75 chars | keep lines ≤ 70 chars |
| Mermaid / PlantUML | not rendered without a marketplace app | don't use; render to PNG |
| Tables | wide tables wrap badly on narrow screens | ≤ 5 columns, short cells |
| Headings | Jira shows h1 huge | start at h2 in Jira |
| Emoji | render everywhere, but noise fast | ≤ 3 per page, top-level headings only |
| Status lozenges / ticket keys | Jira auto-links bare keys with live status | write `PROJ-123` bare |

### Diagrams

Only when a diagram explains something the text can't (flow across systems, dependency
order). Otherwise a table or list.

1. Prefer ASCII in a code block if it fits in 70 columns.
2. Otherwise hand-write an SVG, then convert with whatever is installed:
   `rsvg-convert -w 1600 in.svg -o out.png`, `magick in.svg out.png` or
   `inkscape in.svg --export-filename=out.png`. Check with `command -v`.
3. Upload the PNG (section 4) and embed it with the format that supports images.
4. No statuses, dates or owners inside diagrams: they go stale and can't be edited as text.

## 6. Leftover-markup scan (verify step)

After writing, re-fetch and search the stored text for markup that should have been converted:

| Pattern | Means |
|---------|-------|
| `{{` or `}}` | wiki monospace sent through a Markdown path |
| `h1.` … `h6.` at line start | wiki heading sent through Markdown |
| `\|\|` | wiki table header unconverted |
| `[text\|http` | wiki link unconverted |
| literal `**` or `__` | Markdown bold not converted (or double-escaped) |
| `&lt;ac:` / `&lt;ri:` | storage XML escaped into text |
| `\_` `\*` visible | escapes rendered literally |

Any hit: fix the source, rewrite once, re-verify. Report what remains.
