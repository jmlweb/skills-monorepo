# README media reference

Detail for `/dev-workflow:readme-media`. Each section names the step that reads it.

## 1. Project-type detection (step 1)

Check the manifests in the target directory, first match wins:

| Signal | Type | Media |
|--------|------|-------|
| `package.json` has `bin` | CLI | Terminal GIF (VHS) |
| `pyproject.toml` has `[project.scripts]` or `[tool.poetry.scripts]` | CLI | Terminal GIF (VHS) |
| `Cargo.toml` has `[[bin]]`, or `src/main.rs` exists | CLI | Terminal GIF (VHS) |
| `go.mod` plus a `package main` file (root or `cmd/*/`) | CLI | Terminal GIF (VHS) |
| Deps include `ink`, `blessed`, `textual`, `ratatui`, `bubbletea` | TUI | Terminal GIF (VHS) |
| Deps include `next`, `nuxt`, `vite`, `@sveltejs/kit`, `astro`, `@remix-run/*`, `react-scripts`, `@angular/core` | Web app | Screenshots (Playwright) |
| A `dev`, `start` or `serve` script that starts a server on a port | Web app | Screenshots (Playwright) |
| Deps include `electron`, `tauri`, `react-native`, `expo`, `flutter` (`pubspec.yaml`) | Desktop/mobile | Unsupported in v1 |
| A manifest with none of the above (exports only) | Library | Unsupported in v1 |

Workspace root: `pnpm-workspace.yaml`, `workspaces` in `package.json`, `[workspace]` in
`Cargo.toml` or a `go.work` file, and no CLI or web signal at the root itself. Expand the
workspace globs, run the table on each member, and list only the members that qualify.

Unsupported reasons to state:

- Library: there is no screen to capture; a code sample in the README shows a library better.
- Desktop/mobile: capturing them needs a device or window recorder that v1 does not drive.
- Claude Code plugins: slash commands run inside a Claude Code session, which VHS cannot
  record reliably. Offer only the plugin's standalone CLI, when it has one.

## 2. Tool prerequisites (step 4)

| Media | Check | Install (print it; the user runs it) | Why this tool |
|-------|-------|--------------------------------------|---------------|
| Terminal GIF | `command -v vhs`, `command -v ttyd`, `command -v ffmpeg` | macOS: `brew install vhs` (pulls ttyd and ffmpeg). Linux: `go install github.com/charmbracelet/vhs@latest` plus `ttyd` and `ffmpeg` from the package manager | Scripted `.tape` files replay the same GIF every time, so the media can be regenerated |
| Screenshots | `npx --no-install playwright --version` | `npm i -D playwright` then `npx playwright install chromium` (a download of about 150 MB) | Headless Chromium renders the real app at a fixed viewport |
| Verification | `command -v ffmpeg` | as above | Extracts a frame from the GIF to look at |

## 3. VHS tape template (step 5)

Write it to `docs/media/<slug>.tape` and run `vhs docs/media/<slug>.tape` from the project
root. The `Hide`/`Show` block moves into a scratch dir and puts the CLI on `PATH`, so the
recording shows `mycli ...` and never touches the project tree.

```tape
Output docs/media/<slug>.gif

Set Shell "bash"
Set FontSize 16
Set Width 1000
Set Height 560
Set Padding 20
Set TypingSpeed 40ms
Set Theme "Catppuccin Mocha"

Hide
Type `export PROJECT="$PWD" && cd "$(mktemp -d)"`
Enter
Type `mycli() { node "$PROJECT/dist/bin/mycli.js" "$@"; }`
Enter
Type "clear"
Enter
Show

Type "mycli --help"
Sleep 300ms
Enter
Sleep 2s

Type "mycli list"
Sleep 300ms
Enter
Sleep 3s
```

- When the CLI is already on `PATH`, drop the function line and keep the `cd` line.
- One shot per tape, 5 to 20 seconds long. A shot that needs earlier state (a `setup`
  before a `list`) runs that command inside the `Hide` block.
- Commands that print secrets, tokens, home paths or hostnames are never typed.

## 4. Playwright script template (step 5)

Start the app with the approved command in the background, wait for the URL, then run
`node docs/media/<slug>.mjs` from the project root and stop the server afterwards.

```js
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const shots = [
  { name: "home", path: "/" },
  { name: "dashboard", path: "/dashboard" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
for (const { name, path } of shots) {
  await page.goto(new URL(path, BASE_URL).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: `docs/media/${name}.png` });
}
await browser.close();
```

- Apps behind a login are out of scope for v1: stop and say so when a shot redirects to
  a login page.
- `deviceScaleFactor: 2` keeps text sharp on high-density screens; the PNG is still small.

## 5. Verification (step 6)

| Output | Check | Failure signals |
|--------|-------|-----------------|
| GIF | `ffmpeg -v error -sseof -1 -i <gif> -frames:v 1 -update 1 <scratch>/last.png`, then Read the PNG | Blank or single-colour frame; `command not found`; a stack trace; `Error`; a prompt with no output |
| GIF | File size | Over 2 MB: lower `Width`/`Height`, shorten `Sleep`, or split the shot, then regenerate |
| Screenshot | Read the PNG | Blank page; error overlay; 404; login form; spinner still visible |

Fix the tape or script, regenerate, and check again. After two failed retries, report
the failure with the last frame's description instead of inserting the media.

## 6. README embed (step 7)

Place each embed under the heading it demonstrates, after the first paragraph:

```markdown
![Listing pending tasks with flowstate](docs/media/task-list.gif)
```

- Alt text says what the media shows, in a sentence a screen-reader user can follow.
- Paths are relative to the doc, so the embed renders on GitHub and in the package.
- The diff summary states the bytes each file adds and the total: media committed under
  a published package ships to every user.
