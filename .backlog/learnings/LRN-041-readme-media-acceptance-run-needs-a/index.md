---
id: LRN-041
title: readme-media acceptance run needs a human session plus vhs, ttyd and ffmpeg
status: active
tags: [sandbox, skills, readme-media, testing]
task: TSK-056
created: 2026-10-20
---

`pnpm sandbox:readme-media` opens an interactive `claude --plugin-dir` session. The skill stops for shot-list approval and for diff approval, so an unattended agent cannot complete the run. Recording also needs `vhs`, `ttyd` and `ffmpeg` on PATH. The harness checks its outputs offline: GIF magic bytes, the 2 MB ceiling, the `.tape` next to it, the README embed, and no commit, staging or files outside the doc and `docs/media/`. Its node:test file fakes those outputs, so CI covers the checker without the tools.

`gitInvariantFailures` in `sandbox-lib.mjs` does not fit skills that are meant to leave untracked files: it flags every untracked file, and it accepts only one allowed prefix. Use `git status --porcelain -uall` so new files show up one by one, not as a single directory entry.
