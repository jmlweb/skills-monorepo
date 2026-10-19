---
id: PLN-030
title: dev-workflow: readme-media skill generates README screenshots and GIFs
status: approved
created: 2026-10-19
complexity: medium
reviewed: 2026-10-19
task-id: TSK-056
---

## Goal

Add a user-invoked `readme-media` skill to `dev-workflow` that produces demo media for a project's README or docs: a terminal GIF for CLI/TUI projects, screenshots for web apps. It detects the project type, proposes a shot list, picks the tool, generates the media, verifies it and, after approval, inserts it into the doc.

## Context

- READMEs, including this marketplace's own plugin READMEs, ship without visuals because producing them by hand is tedious.
- Nothing is installed locally except `ffmpeg`: `vhs`, `asciinema`, `agg` and `playwright` are all missing, so tool guidance is a core step, not an edge case.
- `dev-workflow` already owns docs work (`check-docs`) and user-invoked, side-effectful skills (`prune-tests`, `pr-ready`, `agent-handoff`), so the skill fits there as a prompt-only skill. No CLI: the skill orchestrates external tools and keeps no state of its own.
- Decisions agreed with the user:
  - Home: new skill in `dev-workflow`, not a new plugin. Name: `readme-media`.
  - v1 covers CLI/TUI (terminal GIF) and web apps (screenshots). Libraries, desktop and mobile stop with a "not supported yet" message and the reason.
  - Monorepos: when the root has no `bin` or web deps but has workspaces (`pnpm-workspace.yaml`, `workspaces` in `package.json`), the skill lists the sub-projects that qualify and asks which one to document. It never treats the root as the project.
  - Out of scope for v1: demos that need a Claude Code session (slash commands, `claude plugin ...`). VHS cannot record them reliably; the skill says so and offers only the plugin's standalone CLI.
  - Tools: VHS for terminal GIFs, Playwright for web screenshots. The skill never installs anything; it prints the install command, says why it chose that tool, and waits for the user.
  - A shot-list checkpoint: nothing is generated or executed until the user approves the list.
  - Output goes to `docs/media/` inside the documented project (for a monorepo sub-project: `<sub-project>/docs/media/`, so the doc and its media travel together), with the generator source (`.tape` or Playwright script) committed next to it so media can be regenerated. The README edit is shown as a diff and applied only after approval.
  - Self-verification before insertion: extract a frame with `ffmpeg` (GIF) or read the image (screenshot) and check it is not blank or an error screen; fix and retry otherwise.
  - Invocation: user-invoked (`disable-model-invocation: true`), `model: sonnet`, `effort: medium`.
- Acceptance test: the first real run targets `plugins/flowstate`'s README (a CLI project).

## Approach

1. Read `docs/writing-skills.md` and `plugins/dev-workflow/skills/prune-tests/SKILL.md` (closest user-invoked pattern) before drafting.
2. Scaffold `plugins/dev-workflow/skills/readme-media/SKILL.md` with the `new-skill` skill: frontmatter `name`, `argument-hint: [path or doc]`, one-line human description, `disable-model-invocation: true`, `model: sonnet`, `effort: medium`, scoped `allowed-tools` (`Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash(git:*)`, `Bash(vhs:*)`, `Bash(ffmpeg:*)`, `Bash(npx:*)`, `Bash(node:*)`, `Bash(mktemp:*)`, `Bash(mkdir:*)`, `Bash(command:*)`).
3. Write the workflow as numbered steps, each ending in a `Done when:` line:
   - 1. Detect the project type from manifests (`bin` in `package.json`, `[project.scripts]`, `Cargo.toml` `[[bin]]`, `go.mod` with `main`, web framework deps, dev-server scripts). Choose the media type. Unsupported type: stop with the reason. Workspace root: list qualifying sub-projects and ask which one; continue with that sub-project as the project root.
   - 2. Find the doc target (README or the `docs/` file in `$ARGUMENTS`) and the sections that lack visuals. Pick the 2-5 most important features or screens from the README, CLI `--help`, routes or pages.
   - 3. Present the shot list (one block per shot: what, command or URL, target section) and wait for approval. Edits to the list loop back here.
   - 4. Resolve the tool with `command -v`. When missing, print the install command and why, then wait for the user to say it is installed. The skill itself installs nothing.
   - 5. Generate: write the `.tape` or Playwright script into `docs/media/`, run it, and store the output next to it. Shots that create state (for example `flowstate setup`) run in a scratch directory (`mktemp -d`), never in the project's own tree. When the CLI is not on `PATH`, the tape sets up an alias or `PATH` entry inside a `Hide`/`Show` block so the visible command reads `flowstate ...`, not `node plugins/.../dist/bin/...`.
   - 6. Verify each output as described above; retry up to twice, then report the failure instead of inserting.
   - 7. Show the README diff (image/GIF embeds with alt text, placed in the matching section) and apply on approval.
4. Move per-type detail (VHS tape template, Playwright script template, detection table) to `plugins/dev-workflow/references/readme-media.md`, read only on the branch that needs it, per the progressive-disclosure rule.
5. Docs: add the skill to the `dev-workflow` README (command table, a section) and the root `README.md` (skill list row, the "10 skills" counts at lines 64 and 157, the catalog description at line 24).
6. Skip routing evals: user-invoked skills are exempt from trigger-phrase rules (check `scripts/lint-skills.mjs`).
7. Run `pnpm lint:skills`, `claude plugin validate plugins/dev-workflow` and `claude plugin validate .`.
8. Add `scripts/sandbox-readme-media.mjs` (plus a `node:test` file and a `sandbox:readme-media` script in the root `package.json`), modelled on `scripts/sandbox-prune-tests.mjs` and `sandbox-lib.mjs`. Then run the acceptance run through it on `plugins/flowstate`'s README (never by hand, per the playbook); confirm a GIF lands in `plugins/flowstate/docs/media/` and renders in the diff. Prerequisite: `vhs` and `ttyd` installed locally (both missing today).
9. Bump `dev-workflow` to a minor version with `pnpm bump` inside the plugin dir (new skill); the user decides when to push.

## Files to Modify

- `plugins/dev-workflow/skills/readme-media/SKILL.md` — new skill, at most 150 lines
- `plugins/dev-workflow/references/readme-media.md` — new: tape/script templates and project-type detection table
- `plugins/dev-workflow/README.md` — command table row, skill section
- `README.md` — skill list row for `readme-media`; update "10 skills" at lines 64 and 157 and the dev-workflow catalog description
- `scripts/sandbox-readme-media.mjs`, `scripts/sandbox-readme-media.test.mjs` — new live-test harness
- `package.json` — `sandbox:readme-media` script
- `plugins/dev-workflow/package.json`, `plugins/dev-workflow/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — version bump through `pnpm bump` only
- `plugins/dev-workflow/.claude-plugin/plugin.json` — optionally add `screenshot` and `gif` keywords

## Risks & Considerations

- Generation runs the project's own commands and may start dev servers: the approved shot list is the only authority for what runs, and shots must use safe, non-destructive commands with no secrets on screen.
- Web screenshots need a running app (dev server, auth, seed data). v1 covers apps that start with one command and show content without login; the skill asks for the start command and URL when it cannot infer them.
- VHS depends on `ttyd` and `ffmpeg`; the guidance must name every prerequisite, not only `vhs`.
- GIFs can be large; keep a size ceiling (for example under 2 MB) and lower the frame size or duration when exceeded.
- Plugin installs clone this repo, so media committed under a plugin directory ships to every user. The size ceiling applies per file and the skill reports the total added bytes in the diff step.
- A CLI-only GIF undersells plugins whose value is slash-command skills; expect a modest result on the `plugins/flowstate` acceptance run.
- Committed media goes stale as the project evolves; committing the generator source is the mitigation, and `check-docs` does not detect stale visuals today.
- Playwright needs browser binaries (`npx playwright install chromium`), a large download: state it before asking for confirmation.
- `allowed-tools` must stay scoped; bare `Bash` is justified only if project-specific start commands force it.

## Open Questions

- Should a later version support Claude Code session demos (for example by replaying a recorded transcript)?
- Should a later version accept an existing recording (asciinema cast) as input instead of generating one?
- Should `check-docs` learn to flag media older than the source it demonstrates?

## Revision History
- [2026-10-20] Added monorepo detection, scratch-dir and PATH handling, per-sub-project media path, session-demo scope note, plugin-size risk.
- [2026-10-20] After review-idea audit: dropped the nonexistent permissions-table row, added skill-count updates, widened `allowed-tools`, added the sandbox harness and its prerequisites.
