---
id: TSK-056
title: dev-workflow: readme-media skill generates README screenshots and GIFs
status: blocked
priority: P2
tags: []
created: 2026-10-19
source: idea/PLN-030
depends-on: []
started: 2026-10-20
blocked-by: Criterion 7 needs a human-driven pnpm sandbox:readme-media run (interactive claude session approving shot list and diff) with vhs, ttyd, ffmpeg and a logged-in claude on PATH. Criterion 8 (pnpm bump minor) is held until that run passes, since a bumped version merged to main ships the skill.
---

# dev-workflow: readme-media skill generates README screenshots and GIFs

## Description

Add a user-invoked `readme-media` skill to `dev-workflow` that produces demo media for a project's README or docs: a terminal GIF (VHS) for CLI/TUI projects, screenshots (Playwright) for web apps. It detects the project type, proposes a shot list, picks the tool, generates the media, verifies it and, after approval, inserts it into the doc.

Approach: read docs/writing-skills.md and prune-tests SKILL.md; scaffold the skill with new-skill; write numbered steps each ending in "Done when:" (detect type, find doc target, shot-list approval, resolve tool without installing, generate in scratch dir, verify with up to 2 retries, README diff on approval); move per-type detail to references/readme-media.md; update READMEs; lint and validate; add sandbox harness and run the acceptance run on plugins/flowstate; bump dev-workflow minor.

Full plan: .backlog/ideas/complete/ (PLN-030).

## Acceptance Criteria

- [x] readme-media SKILL.md created in dev-workflow (user-invoked, sonnet/medium, scoped allowed-tools, <=150 lines)
- [x] references/readme-media.md holds VHS/Playwright templates and detection table
- [x] Workflow covers project-type detection, monorepo sub-project choice, shot-list approval, tool check without installing, generation in scratch dir, verification with retries, README diff on approval
- [x] dev-workflow README and root README updated (command table, skill counts, catalog description)
- [x] pnpm lint:skills, claude plugin validate plugins/dev-workflow and claude plugin validate . pass
- [x] scripts/sandbox-readme-media.mjs, its node:test file and sandbox:readme-media script added
- [ ] Acceptance run via sandbox on plugins/flowstate README lands a GIF in plugins/flowstate/docs/media/
- [ ] dev-workflow bumped to a minor version via pnpm bump

## Notes

## Learnings

- LRN-040: Stray package.json or lockfile in a parent dir breaks the suite; turbo drops TMPDIR
- LRN-041: readme-media acceptance run needs a human session plus vhs, ttyd and ffmpeg
## Progress Log

- [2026-10-19] Created
- [2026-10-20] Started
- [2026-10-20] criterion 1 — evidence: plugins/dev-workflow/skills/readme-media/SKILL.md has disable-model-invocation: true, model: sonnet, effort: medium, scoped allowed-tools; body 100 lines; pnpm lint:skills → 0 errors (2026-10-20)
- [2026-10-20] criterion 2 — evidence: plugins/dev-workflow/references/readme-media.md (131 lines) holds the detection table, tool prerequisites, VHS tape and Playwright script templates, verification and embed rules (2026-10-20)
- [2026-10-20] criterion 3 — evidence: SKILL.md steps 1-7 cover detection plus workspace member choice, doc target, shot-list approval loop, command -v checks with no install, scratch-dir generation, verification with 2 retries, diff then apply on approval; rg -c Done when → 9 (2026-10-20)
- [2026-10-20] criterion 4 — evidence: plugins/dev-workflow/README.md gains table row, mermaid node, user-invoked note, skill section, Requirements row; root README.md gains catalog wording, 11 skills (two places), skill row, sandbox command (2026-10-20)
- [2026-10-20] criterion 5 — evidence: pnpm lint:skills → 0 errors 0 warnings; claude plugin validate plugins/dev-workflow → passed; claude plugin validate . → passed (2026-10-20)
- [2026-10-20] criterion 6 — evidence: scripts/sandbox-readme-media.mjs + .test.mjs added, sandbox:readme-media in root package.json; node --test scripts/*.test.mjs → pass 120 fail 0 (2026-10-20)
- [2026-10-20] Blocked: Criterion 7 needs a human-driven pnpm sandbox:readme-media run (interactive claude session approving shot list and diff) with vhs, ttyd and ffmpeg installed; none are available unattended. Criterion 8 (pnpm bump minor) is held until that run passes, since a bumped version merged to main ships the skill.
- [2026-10-20] Blocked: Criterion 7 needs a human-driven pnpm sandbox:readme-media run (interactive claude session approving shot list and diff) with vhs, ttyd, ffmpeg and a logged-in claude on PATH. Criterion 8 (pnpm bump minor) is held until that run passes, since a bumped version merged to main ships the skill.
- [2026-10-20] Plugin projects now record a live claude session running their slash commands instead of the standalone CLI; plugin tape template smoke-tested with vhs on /flowstate:overview (624 KB GIF)