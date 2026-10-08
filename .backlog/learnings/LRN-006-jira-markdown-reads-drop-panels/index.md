---
id: LRN-006
title: Jira Markdown reads drop panels; a saved REST response is not a bare ADF doc
status: active
tags: [atlassian-polish, adf, jira, lossy-content]
task: TSK-018
created: 2026-10-08
---

**Context:** TSK-018 real-ticket test on CF-620 (2 panels, 1 mention, 1 inline image).

**Insight:** the MCP Markdown (including the `adf` read and the createJiraIssue response) shows no marker for a panel: it arrives as bold text or a plain paragraph. Only REST v3 ADF or the rendered HTML (`class="panel"`) keeps it. Separately, `curl … > KEY.adf.json` saves the whole REST response, so the document sits under `fields.description`. lossy-scan read that file as "nothing lossy" and exited 0, which let the gate pass on a ticket full of panels.

**Application:** detect panels from HTML or REST ADF, never Markdown. Any scanner fed a saved file must validate its shape (`type: "doc"`) and fail loudly instead of returning an empty result (LRN-001).
