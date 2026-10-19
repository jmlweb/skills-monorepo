---
id: TSK-056
title: dev-workflow: readme-media skill generates README screenshots and GIFs
status: pending
priority: P2
tags: []
created: 2026-10-19
source: idea/PLN-030
depends-on: []
---

# dev-workflow: readme-media skill generates README screenshots and GIFs

## Description

Add a user-invoked `readme-media` skill to `dev-workflow` that produces demo media for a project's README or docs: a terminal GIF (VHS) for CLI/TUI projects, screenshots (Playwright) for web apps. It detects the project type, proposes a shot list, picks the tool, generates the media, verifies it and, after approval, inserts it into the doc.

Approach: read docs/writing-skills.md and prune-tests SKILL.md; scaffold the skill with new-skill; write numbered steps each ending in "Done when:" (detect type, find doc target, shot-list approval, resolve tool without installing, generate in scratch dir, verify with up to 2 retries, README diff on approval); move per-type detail to references/readme-media.md; update READMEs; lint and validate; add sandbox harness and run the acceptance run on plugins/flowstate; bump dev-workflow minor.

Full plan: .backlog/ideas/complete/ (PLN-030).

## Acceptance Criteria

- [ ] readme-media SKILL.md created in dev-workflow (user-invoked, sonnet/medium, scoped allowed-tools, <=150 lines)
- [ ] references/readme-media.md holds VHS/Playwright templates and detection table
- [ ] Workflow covers project-type detection, monorepo sub-project choice, shot-list approval, tool check without installing, generation in scratch dir, verification with retries, README diff on approval
- [ ] dev-workflow README and root README updated (command table, skill counts, catalog description)
- [ ] pnpm lint:skills, claude plugin validate plugins/dev-workflow and claude plugin validate . pass
- [ ] scripts/sandbox-readme-media.mjs, its node:test file and sandbox:readme-media script added
- [ ] Acceptance run via sandbox on plugins/flowstate README lands a GIF in plugins/flowstate/docs/media/
- [ ] dev-workflow bumped to a minor version via pnpm bump

## Notes

## Learnings

## Progress Log

- [2026-10-19] Created