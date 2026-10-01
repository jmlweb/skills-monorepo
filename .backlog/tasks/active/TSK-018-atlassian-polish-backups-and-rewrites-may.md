---
id: TSK-018
title: atlassian-polish: backups and rewrites may lose rich Jira content
status: active
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