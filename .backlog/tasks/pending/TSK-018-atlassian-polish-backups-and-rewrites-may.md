---
id: TSK-018
title: atlassian-polish: backups and rewrites may lose rich Jira content
status: pending
priority: P2
tags: [atlassian-polish, adf, data-loss, backup]
created: 2026-10-01
source: manual
depends-on: []
started: 2026-10-01
---

# atlassian-polish: backups and rewrites may lose rich Jira content

## Description

When polish fetches a Jira ticket, Jira returns Markdown even when ADF (Jira's native document format) was requested. Markdown cannot express panels (colored callout boxes), @mentions or inline images, so they may be flattened or dropped on the way in.

The rewrite is then sent back as the full description, and the saved backup file is that same Markdown copy. The backup may therefore not hold what was really in the ticket, which defeats its purpose as a recovery path.

The CF tickets tested so far (CF-574, CF-575, CF-530, CF-536) were plain text, tables and lists, so this has not bitten yet.

Interim guidance until fixed: before polishing a ticket with panels, mentions or screenshots, check it in the Jira UI first. The ticket's History tab is the only full-fidelity way back.

Priority P2 is a recommendation: it is silent data loss on a write path, but nothing has been observed lost yet. Raise to P1 if you want it ahead of other work.


## Acceptance Criteria

- [ ] Confirm whether getJiraIssue can return real ADF (the markdown read path flattened content even with responseContentFormat adf); document what works per tool, or use REST v3 as the read path when consent exists
- [ ] Backup stores the original in the richest format available (ADF JSON when obtainable), not the Markdown the rewrite starts from
- [ ] Polish detects panels, @mentions, inline images/media and other nodes Markdown cannot express, and warns before rewriting
- [ ] Tickets with such nodes either keep those nodes intact (rewrite only the plain parts) or require explicit user approval to flatten them
- [ ] Test with a real ticket containing a panel, a mention and a screenshot; verify nothing is dropped after the write
- [ ] Docs state the History tab is the only full-fidelity recovery until this is fixed

## Notes

## Learnings

## Progress Log

- [2026-10-01] Created
- [2026-10-01] Started
- [2026-10-01] Returned to pending
- [2026-10-01] Paused 2026-10-01 (7d7c0b6: lossy-content.md, fetch with renderedFields, 3-file backup, LOSSY preview notice). Left: verify panel/mention/macro markers on a real ticket; test REST ADF backup (needs consent; a broad REST scan was blocked by the permission check, so name one ticket); enforce preserve-lossy-nodes rewrite; real-ticket test with panel+mention+screenshot; step 5 of SKILL.md still describes a single backup file.
- [2026-10-07] Backlog review: since pause, b7a6041/9b15aa4/b8105f1/1185135 made backups verbatim and non-overwriting, stopped flagging issue-key smart links as LOSSY, and preserve mentions/smart links via readback-to-md + ADF writes. Criteria 1 (MCP returns Markdown, documented in lossy-content.md) and 6 (History tab in docs) look met; 3-4 are documented as rules but panel/mention markers are unverified. Left: one real ticket with panel+mention+screenshot (criterion 5, also verifies markers); first REST v3 ADF backup with consent (criterion 2); SKILL.md step 5 path still shows one <KEY>.<md|json|xml> file instead of .md + .rendered.html + .adf.json.