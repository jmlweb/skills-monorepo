---
id: LRN-039
title: A bumped version pushed to main ships to users; the tag only cuts the GitHub Release
status: active
tags: [release, marketplace, claude-code, versioning]
task: 
created: 2026-10-18
---

## Context
On 2026-10-11 an agent told the user that main's untagged bumps (flowstate 2.12.1, dev-workflow 1.5.2) reach users "only once you tag and release". AGENTS.md invariant 6 framed releases as tag-driven only.

## Insight
Claude Code docs (code.claude.com/docs/en/plugins/host-marketplace, plugins/loading): a GitHub marketplace is read from the default branch HEAD unless the user pins a ref. The installed copy is keyed by the computed version (plugin.json `version`, then the marketplace entry, then the commit SHA), and users get a new copy when that version differs, on `/plugin marketplace update`, `claude plugin update` or auto-update. Repo tags `plugins/<name>/v<semver>` play no role in that; they only trigger release.yml and the GitHub Release. The docs say nothing about GitHub Releases.

## Application
Treat `git push` of a version bump as publishing, same as a tag push: only with the user's go-ahead, and inside the release flow (AGENTS.md invariant 6, playbook mistake 10). Do not claim users lack a change because it is untagged.
