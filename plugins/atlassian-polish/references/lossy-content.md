# Lossy content (Jira reads)

Read in step 3 (fetch) and step 5 (backup) for every Jira issue.

## What the MCP gives you

Verified on Cloud (CF-556, an issue with an inline screenshot):

- `getJiraIssue` with `responseContentFormat: "adf"` still returns the description as
  **Markdown**. The Atlassian `fetch` tool does too. Neither returns ADF.
- An inline image arrives as `![](blob:https://media…/?type=file&…&id=<mediaId>&…)`. Writing
  that Markdown back is not a safe round trip for the image.
- `expand: renderedFields` additionally returns the description as **HTML**. Richer than
  Markdown (the image shows up as an `<img>` pointing at the attachment), read-only: it can't
  be written back.
- Only REST v3 (`GET /rest/api/3/issue/KEY?fields=description`) returns real ADF. It needs the
  stored API token, so only after the usual explicit consent. **Untested here.**

## Rules

1. Fetch Jira issues with `expand: renderedFields`.
2. Backup (step 5) saves **both** `<KEY>.md` (what the MCP returned) and `<KEY>.rendered.html`.
   With REST consent, also save `<KEY>.adf.json` from the GET above. Say in the report which
   of the three exist; without the ADF file the backup is lossy.
3. **Backups are verbatim.** Write the tool's `description` and `renderedFields.description`
   strings exactly as returned: no summary, no truncation, no "condensed" macro markup, no
   explanatory comment added. Long or noisy is not a reason. With REST consent, prefer
   `curl -sS … > <file>` so the bytes never pass through a rewrite. If a verbatim copy can't
   be written, stop before the write step and say so; never write over a body whose backup
   is a summary. Never overwrite an existing backup file: if `<KEY>.md` exists (second run
   the same day), save as `<KEY>.2.md`, `<KEY>.2.rendered.html`, and so on.
4. Scan for content Markdown can't carry:

   | Marker | Meaning | Status |
   |--------|---------|--------|
   | `![](blob:` in the Markdown | inline image / media node | verified |
   | `class="panel` or `ak-editor-panel` in the HTML | panel | unverified |
   | `user-hover` or `data-user` in the HTML | @mention | unverified |
   | `data-macro` / `status-macro` / `aui-lozenge` in the HTML, **not** wrapping an issue key | macro or status lozenge | unverified |

   **Not lossy:** a `jira-issue-macro` (with its `aui-lozenge` status) whose text is an issue
   key is a smart link. Never raise `LOSSY:` for it. A Markdown write re-creates it from a
   bare key; an ADF write only if `md-to-adf` gets `--jira-base`/`--projects` (formats §1).
   Note `renderedFields` auto-links bare keys even when the stored ADF is plain text, so it
   can't prove a link survived. On a re-read, the MCP Markdown shows smart links and
   mentions as `<custom data-type=…>` tags: convert them with `readback-to-md` (SKILL step 3),
   never write them back as Markdown.
5. Any hit: put a `LOSSY:` line in the preview naming what was found. Then either rewrite
   only the plain parts and leave the lossy nodes out of the write (say so), or skip the
   description. Flattening needs the user's explicit yes.
6. No hit does not prove nothing was lost (the unverified markers may be wrong). Every Jira
   preview ends with: "Read as Markdown; panels, mentions and media may be flattened.
   Recovery: the issue's History tab."
