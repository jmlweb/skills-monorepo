---
name: readme-media
argument-hint: [path or doc]
description: Records terminal GIFs or web screenshots for a README or doc and embeds them after you approve the shot list and the diff.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(git:*), Bash(vhs:*), Bash(ffmpeg:*), Bash(npx:*), Bash(node:*), Bash(mktemp:*), Bash(mkdir:*), Bash(command:*)
model: sonnet
effort: medium
---

# README Media

Produce demo media for a project's docs: a terminal GIF (VHS) for a CLI or TUI, screenshots (Playwright) for a web app. Detection rules, install commands, templates and verification checks are in `${CLAUDE_PLUGIN_ROOT}/references/readme-media.md`; each step names the section to read.

The **project root** is the directory being documented. Media and its generator source go to `<project root>/docs/media/`, so a doc and its media travel together.

## Arguments

`$ARGUMENTS` is a project directory or a doc file. A directory means its `README.md`. A file means that doc, and its project root is the nearest ancestor holding a manifest. Empty means the current directory.

## Prerequisites

Run `git status --porcelain` in the project root and note what it prints. The final report compares against it, so the user can tell the skill's changes from their own.

Done when: the pre-run status is recorded.

## Workflow

### 1. Detect the project type

Read section 1 of the reference. Apply its table to the manifests in the project root.

- CLI or TUI: the media is a terminal GIF.
- Web app: the media is screenshots.
- Unsupported (library, desktop, mobile): stop and give the reason from the reference.
- Workspace root with no signal of its own: list the members that qualify, each with its type, and ask which one to document. The chosen member becomes the project root; the root itself is never documented.
- Claude Code plugin: state that slash-command demos are out of scope and continue only with its standalone CLI.

Done when: the project root and its media type are fixed, or the run has stopped with a reason.

### 2. Find the doc target and pick features

Read the doc target. Note its sections and any existing images. Then gather candidates from the doc, the CLI's `--help`, or the app's routes and pages.

Pick the 2 to 5 features or screens a new reader most needs to see, preferring sections that have no visual yet.

Done when: you hold 2 to 5 candidate shots, each tied to a section of the doc.

### 3. Approve the shot list

Show one block per shot:

```
Shot A: <what it shows>
  Run:     <commands typed, or URL visited>
  Section: <doc heading it goes under>
  File:    docs/media/<slug>.gif or .png
```

Commands in a shot are read-only or run against a scratch directory. A shot whose command would change the project, call the network or print secrets is replaced or dropped before you show the list.

Ask the user to approve, edit or drop shots. Loop on this step until they approve. Nothing runs before approval: the approved list is the only authority for what executes.

Done when: the user has approved a shot list.

### 4. Check the tools

Read section 2 of the reference. Run each `command -v` check for the media type.

When a tool is missing, print its install command and why this tool was chosen, then wait for the user to say it is installed. Installing is the user's call, because these tools are system-wide and Playwright's browser download is large. Re-run the checks after they reply.

Done when: every check for the media type succeeds.

### 5. Generate

Run `mkdir -p <project root>/docs/media`. Read section 3 (GIF) or section 4 (screenshots) of the reference.

- GIF: write one `docs/media/<slug>.tape` per shot from the template. Every shot runs inside a scratch directory created in the tape's hidden preamble, so state such as `setup` output never lands in the project tree. When the CLI is not on `PATH`, define it in that same hidden block so the visible command reads like the README's. Run `vhs docs/media/<slug>.tape` from the project root.
- Screenshots: ask the user for the start command and URL when step 1 could not infer them. Write `docs/media/<slug>.mjs` from the template, start the app, run the script, then stop the app.

Done when: each approved shot has its generator source and its output file in `docs/media/`.

### 6. Verify

Read section 5 of the reference. Check every output: for a GIF, extract the last frame into a `mktemp -d` scratch dir with `ffmpeg` and Read it; for a screenshot, Read the PNG. Check GIF size against the 2 MB ceiling.

On a failure signal, fix the tape or script and regenerate that shot. Retry at most twice per shot. A shot that still fails is reported with what its last frame shows and stays out of the doc.

Done when: every shot has passed, or has failed twice and is marked as failed.

### 7. Show the diff and apply

Read section 6 of the reference. Draft the doc edit: one embed per passing shot, with alt text, placed in its section. Show it as a unified diff, followed by the size of each new media file and the total bytes added.

Ask the user to approve. Apply the edit with Edit only after a yes. On a no, leave the doc as it was and keep the media for the user to review. Leave staging and committing to the user.

Done when: the user has answered, and the doc matches that answer.

### 8. Report

State in five lines or fewer:

- Media: each file written under `docs/media/`, with its size.
- Sources: the `.tape` or `.mjs` files, and the command that regenerates them.
- Doc: edited or unchanged.
- Failed: shots that did not pass verification, with their files left in `docs/media/` for the user to delete or fix.
- Next step: review with `git status` and `git diff`, then `/dev-workflow:commit`.

Done when: the report is printed and `git status --porcelain` shows only the doc and `docs/media/` beyond the pre-run status.
