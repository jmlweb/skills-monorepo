---
id: LRN-044
title: Lint double-quoted skill placeholders per section, skipping fences and heredocs
status: active
tags: [lint-skills, skills, shell]
task: TSK-054
created: 2026-10-24
---

## Context
TSK-054 added the shell-quoted-text rule to scripts/lint-skills.mjs. The report's grep for "{{X}}" found 29 sites but missed REASON in complete-task, which sits inside a longer quoted string.

## Insight
Detecting placeholders needs a quote-state scan of each command, not a regex for "{{X}}". Commands are fenced lines (joined across backslash continuations, heredoc bodies skipped) and inline code spans that start with node/git or carry a --flag. Headings inside output fences must not split sections. parallel and review-idea sit at exactly 150 body lines, so phrasing rules there must be appended to existing lines; a new line trips body-length under --strict in CI.

## Application
Name ID or path placeholders with an ID, IDS, PATH, DIR, FILE or BACKLOG suffix so the rule treats them as safe. Put free-text phrasing rules in the same ### section as the command, using "without `"`".
