# 🧼 code-hygiene

> A Claude Code plugin with slash commands that keep a codebase clean: strip LLM-style comments, prune redundant tests, harden code against past bugs, verify UI changes in a real browser, audit docs and record README media. Nothing here needs GitHub; it works in any git repo.

## Installation

```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install code-hygiene@jmlweb
```

Looking for `/commit`, `/open-pr` or `/review-pr`? Those live in [`dev-workflow`](../dev-workflow/).

---

## 🗺️ Skills at a glance

> 💡 Commands are namespaced (`/code-hygiene:deslop`); the short form (`/deslop`) works while no other plugin claims the name. 🙋 = **you run it**: Claude never starts `/prune-tests`, `/readme-media` or `/harden` on its own; the rest it can also pick up from phrases like *"deslop my branch"* or *"check docs"*.

| Skill | Use it when… | Writes anything? |
|-------|--------------|------------------|
| 🧹 `/deslop` | your branch has chatty comments | Removes only the comments you select |
| 📝 `/check-docs` | docs may have drifted from the code | Nothing until you approve each change |
| 🧪 🙋 `/prune-tests` | the suite is slow or you suspect redundant tests | Only the items you approve, in the working tree; never commits |
| 🛡️ 🙋 `/harden` | code needs a real edge-case audit | Attack tests and fixes in the working tree; never commits |
| 🎬 🙋 `/readme-media` | your README has no screenshots or demo GIF | GIFs or screenshots plus their sources in `docs/media/`; the README only after you approve the diff; never commits |
| 🖥️ `/verify-ui` | you changed components, styles or pages and want the browser to confirm it | Nothing; fixes only when you ask after reading the table |

None of them commits. Commit with your usual flow (for example `/dev-workflow:commit` if you have that plugin).

---

## Skills

### 🧹 `/deslop` — Strip LLM-style comments

Removes comments an LLM added on your branch that restate code, narrate changes or sell the result, and keeps the ones that explain why.

```bash
/deslop            # base = upstream branch, else origin/HEAD
/deslop develop    # compare against another base branch
```

**What it does:**
- 🎯 Looks only at lines added in `git diff -M <base>...HEAD` (renames detected), so older comments are never touched
- 🚫 Skips generated, vendored and lock files, and all Markdown
- 🚩 Flags restating comments, boilerplate JSDoc, change-log comments, section banners and marketing tone
- 🛟 Keeps why-comments, invariants, workarounds with links and lint-required public API docs
- 🔢 Shows one numbered list across all files; you answer once (`all`, `1-4,7`, `none`)
- ✂️ Removes only the selected comments and commits nothing

---

### 📝 `/check-docs` — Documentation audit

Audits docs on two axes: **content drift** (versions, commands, paths, examples, instructions out of sync with code) and **structural fit** (a 3-tier layout — rules stay terse, READMEs stay human, deep docs live under `docs/`). Markdown style/formatting is left to a linter.

```bash
/check-docs                  # full audit (freshness + structure)
/check-docs README.md        # single file
/check-docs packages/foo     # single package
/check-docs agents           # only AGENTS.md / CLAUDE.md / .claude/
/check-docs structure        # only the structural pass
```

**3-tier doc layout it enforces:**

| Tier | Files | Cap | Voice |
|------|-------|-----|-------|
| 📏 Rules | `CLAUDE.md`, `AGENTS.md`, `.claude/**/*.md` | < 100 lines | terse, directive |
| 📖 README | `README.md` (root + per-package) | no cap | human, bird's-eye |
| 📚 Docs | `docs/**/*.md` (root or per-package) | < 300 lines | deep technical |

**What it does:**
- 🔄 Verifies versions, commands, paths, code examples and internal links against the current repo
- 📐 Flags oversized rules/docs files and proposes extraction diffs into `docs/`
- 🧠 Validates agent instructions reflect the actual conventions and stay terse
- 🗂️ Detects missing `docs/` index when a docs folder has 3+ files; flags orphan docs
- 📊 Reports findings grouped by severity (Critical / High / Medium / Low) with proposed fixes
- 🙋 Asks before writing any content change — never auto-edits
- 🏗️ Monorepo-aware: audits each package independently
- 🚫 Does **not** audit or fix markdown style/formatting — leave that to your linter of choice

---

### 🧪 `/prune-tests` — Find tests that add nothing

Finds tests that repeat what other tests already check, proposes rewrites that keep every check, and applies only what you approve. It never commits.

```bash
/prune-tests                 # whole repo
/prune-tests packages/foo    # one package
```

**What it does:**
- 🔍 Detects the test runner (vitest, jest or `node --test`) and its coverage support
- 🧾 Static scan: assertion-free, trivial, skipped, duplicate and sleepy tests, with no test run needed
- 📊 Optional dynamic pass (asked first, with a cost estimate): per-file coverage, and Stryker kill sets when Stryker is installed
- 🏷️ Labels every proposal: `C1…` deletions (redundant tests ranked by time saved, then clutter) and `R1…` rewrites that passed verification; config advice stays unlabelled
- ✅ Each rewrite is applied and run 3 times (plus shuffled order where the runner supports it, and a coverage comparison where coverage is available) before you see it; failed rewrites are never shown
- 🙋 Applies only the labels you reply with, then re-runs the suite and restores anything that broke it

> **Try test selection first.** `vitest --changed` runs only the tests a diff affects, with nothing deleted. Use `/prune-tests` when the suite is still slow or you want less to maintain.

> **A passing suite does not prove fault detection was kept.** The re-run catches mistakes; your approval of each item is the real check. Criteria and the evidence behind them: [`references/test-redundancy.md`](references/test-redundancy.md).

---

### 🎬 `/readme-media` — Screenshots and GIFs for your README

Records demo media for a README or doc and embeds it where it belongs. It never installs a tool and never commits.

```bash
/readme-media                      # README in the current directory
/readme-media packages/cli         # one workspace member
/readme-media docs/getting-started.md
```

**What it does:**
- 🔍 Detects the project type: CLI/TUI → terminal GIF with [VHS](https://github.com/charmbracelet/vhs); Claude Code plugin → GIF of its slash commands in a live `claude` session; web app → screenshots with [Playwright](https://playwright.dev)
- 🗂️ At a workspace root, lists the members worth documenting and asks which one
- 🎯 Proposes 2–5 shots tied to README sections; nothing runs until you approve the list
- 🧰 Checks the tools with `command -v`; when one is missing it prints the install command and waits
- 🧪 Records in a scratch directory, so demo commands never touch your tree
- ✅ Checks every output (last GIF frame, each screenshot) for blank or error screens and retries up to twice
- 📝 Shows the README diff with alt-text embeds and the bytes added; applies it only after you say yes

Media and its source (`.tape` or Playwright script) land in `docs/media/` next to the doc, so you can regenerate them. For a Claude Code plugin, the GIF records a live `claude` session running its slash commands. That spends tokens, and each regeneration gives slightly different text. Libraries, desktop and mobile apps are not supported yet. Templates and detection rules: [`references/readme-media.md`](references/readme-media.md).

---

### 🛡️ `/harden` — Attack code with the bugs you already shipped

Audits named code for the bug classes your repo has really shipped. Every bug is proven with a failing test before anything is fixed. It never commits.

```bash
/harden src/parser.ts     # named files, modules or symbols
/harden recent            # what changed since the last release
/harden                   # proposes up to 10 targets for you to pick
```

**What it does:**
- 🔍 Finds your test, lint and build commands from CI, agent instructions and manifests, in any stack; asks when it cannot
- 📜 Derives bug classes from your failure-mode table, `.backlog` reports and `fix:` history; a [generic list](references/harden-attacks.md) is only the fallback
- 🧪 Writes each attack test first and keeps the failing output as proof
- 🔧 Fixes minimally; a fix that would change a public signature or documented behaviour stops for your decision
- 🚫 Leaves existing assertions, thresholds and suppressions as they are
- 📋 Proposes one [failure-mode row](references/failure-modes.md) per confirmed bug, traced to the commit it repeats

---

### 🖥️ `/verify-ui` — Measure a UI change in a real browser

Checks the running app against your project's `docs/verify-ui.md` contract and returns a delta table. A read-only `ui-auditor` agent drives Chrome through the [chrome-devtools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp); the skill starts the dev server, picks the scope and relays the table unchanged.

```bash
/verify-ui                       # surfaces matched by the current git diff
/verify-ui Home, Pricing         # named surfaces
/verify-ui src/components/nav/** # surfaces whose Scope matches the globs
```

**What it does:**
- 📄 Reads `docs/verify-ui.md`: base URL and start command, surfaces, viewports, invariants with expected values, and the `Pending` and `Known` lists. Missing contract → stops and points at the format
- 🧭 Scopes the run from your argument or the diff; a diff that matches nothing measures every surface and says so
- 🚀 Probes the base URL and runs the contract's start command only when the app is down
- 📏 Measures what the browser computed (`getComputedStyle`, element counts, bounding boxes, console errors) rather than reading the CSS
- 🧾 Returns rows as `FAIL`, `PENDING` (expected gap, in progress), `KNOWN` (accepted) or `PASS`, so the one real regression is not buried in noise
- ⏭️ Lists every check it could not run; a narrowed run never reads as clean
- 🚫 Stops with an actionable message when the chrome-devtools MCP server is absent; it never reports without a browser

Contract format with a worked example: [`references/verify-ui-contract.md`](references/verify-ui-contract.md).

---

## 🧰 CLI

The test skills call a bundled zero-dependency CLI for everything that must be deterministic. You can run it directly too: add `--json true` to any command for JSON output.

```bash
node plugins/code-hygiene/dist/bin/code-hygiene.js <command> [flags]
```

| Command | Used by | What it does |
|---------|---------|--------------|
| `detect-test-runner` | `/prune-tests`, `/harden` | Detects vitest, jest or `node --test`, with test, suite, coverage and shuffle commands, and whether Stryker is installed |
| `test-static-scan` | `/prune-tests` | Finds assertion-free, trivial, skipped, duplicate, parameterisable and sleepy tests |
| `test-verify-rewrite` | `/prune-tests` | Swaps in a rewritten test file, runs it N times, restores the original, and checks cases, assertions, timing and coverage (`--claim lines\|time\|fold`, `--coverage-command`) |
| `coverage-subsets` | `/prune-tests` | Finds test files whose coverage (Istanbul JSON or LCOV) is a subset of another's |
| `mutation-subsets` | `/prune-tests` | Finds tests whose Stryker kill set is a subset of another's; warns when bail mode hides killers |

Exit codes: `0` clean, `1` findings or a failed verification, `2` error.

---

## Requirements

| Skill | Requirement |
|:------|:------------|
| `/deslop` | Git |
| `/check-docs` | Git |
| `/prune-tests` | Git (clean working tree) + a supported test runner; coverage needs a coverage provider, Stryker is optional |
| `/harden` | Git (clean working tree) + a test command it can discover or you provide |
| `/readme-media` | Git; GIFs need `vhs`, `ttyd` and `ffmpeg`; screenshots need Playwright with Chromium (`npx playwright install chromium`) |
| `/verify-ui` | Git + `docs/verify-ui.md` + the `chrome-devtools` MCP server (`claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --isolated`) |

## License

MIT
