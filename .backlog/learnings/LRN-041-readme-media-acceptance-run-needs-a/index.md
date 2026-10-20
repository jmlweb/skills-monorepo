---
id: LRN-041
title: readme-media acceptance run needs a human session plus vhs, ttyd, ffmpeg and claude
status: active
tags: [sandbox, skills, readme-media, testing]
task: TSK-056
created: 2026-10-20
---

`pnpm sandbox:readme-media` opens an interactive `claude --plugin-dir` session. The skill stops for shot-list approval and for diff approval, so an unattended agent cannot complete the run. Recording needs `vhs`, `ttyd` and `ffmpeg` on PATH, and for a Claude Code plugin target also a logged-in `claude`: the tape drives a live session running the plugin's slash commands. The harness checks its outputs offline: GIF magic bytes, the 2 MB ceiling, the `.tape` next to it, the README embed, and no commit, staging or files outside the doc and `docs/media/`. Its node:test file fakes those outputs, so CI covers the checker without the tools.

Recording `claude` under VHS works, with traps: the folder-trust dialog defaults to "No, exit" (press Down before Enter); a custom status line hides "? for shortcuts", so wait on the "Claude Code v" banner; the user's status line and permission mode leak into the GIF unless the tape passes a blank statusLine via --settings and --permission-mode default; a parent session's CLAUDECODE / CLAUDE_CODE_CHILD_SESSION markers add a footer warning unless unset.

`gitInvariantFailures` in `sandbox-lib.mjs` does not fit skills that are meant to leave untracked files: it flags every untracked file, and it accepts only one allowed prefix. Use `git status --porcelain -uall` so new files show up one by one, not as a single directory entry.
