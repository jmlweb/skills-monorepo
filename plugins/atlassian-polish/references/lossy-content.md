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
3. Scan for content Markdown can't carry:

   | Marker | Meaning | Status |
   |--------|---------|--------|
   | `![](blob:` in the Markdown | inline image / media node | verified |
   | `class="panel` or `ak-editor-panel` in the HTML | panel | unverified |
   | `user-hover` or `data-user` in the HTML | @mention | unverified |
   | `data-macro` / `status-macro` / `aui-lozenge` in the HTML | macro or status lozenge | unverified |

4. Any hit: put a `LOSSY:` line in the preview naming what was found. Then either rewrite
   only the plain parts and leave the lossy nodes out of the write (say so), or skip the
   description. Flattening needs the user's explicit yes.
5. No hit does not prove nothing was lost (the unverified markers may be wrong). Every Jira
   preview ends with: "Read as Markdown; panels, mentions and media may be flattened.
   Recovery: the issue's History tab."
