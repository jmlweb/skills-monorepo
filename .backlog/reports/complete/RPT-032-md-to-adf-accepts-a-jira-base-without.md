---
id: RPT-032
title: md-to-adf accepts a --jira-base without a scheme and writes broken smart links
type: bug
severity: low
status: triaged
created: 2026-11-13
triaged: 2026-11-13
task-id: TSK-087
---

## What happens

`atlassian-polish md-to-adf --jira-base <url> --projects <A,B>` never validates its two values (`plugins/atlassian-polish/src/bin/atlassian-polish.ts:85-88`). `markdownToAdf` only strips trailing slashes from the base (`plugins/atlassian-polish/src/core/md-to-adf.ts:52`) and prefixes it to `/browse/<KEY>`. A site passed without `https://`, which is an easy slip when the skill reads the site from the target, yields an `inlineCard` whose `url` is not an absolute URL. The command exits 0, so the broken smart link is written to Jira.

`--projects ','` (or any value that trims to nothing) is accepted too: no key is linked and nothing says so. A `javascript:` base is also accepted; the operator supplies the flag, so this is a validation gap, not an injection.

## Reproduction

```
printf 'PROJ-12' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf --jira-base acme.atlassian.net --projects PROJ
```

Observed (exit 0):

```
{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"inlineCard","attrs":{"url":"acme.atlassian.net/browse/PROJ-12"}}]}]}
```

```
printf 'x' | node plugins/atlassian-polish/dist/bin/atlassian-polish.js md-to-adf --jira-base https://a --projects ','
```

Observed: exit 0, keys silently never linked.

## Expected

`--jira-base` must parse as an absolute `http:` or `https:` URL and `--projects` must hold at least one project key; otherwise exit 2 with an actionable message, as the existing "must be used together" check does.
