# Agent playbook

Companion to `AGENTS.md`. The rules file holds the map, invariants and conventions; this
file holds the longer material an agent reads when it reaches the matching step: the
mistakes to avoid, the per-deliverable checklist, and the release mechanics.

## Named mistakes a weaker model makes here — and the rule that prevents each

1. **Edits `dist/` directly** (it's right there in the diff). → `dist/` is generated; edit
   `src/`, let the pre-commit hook rebuild. If you must rebuild manually: `pnpm build`, then
   stage `dist/`.
2. **Bumps a version by editing one file.** → Versions live in 3–4 places. Only ever bump via
   `pnpm bump <patch|minor|major|x.y.z>` inside the plugin dir (wraps `scripts/bump-plugin.sh`,
   updates all files). Never sed a version string.
3. **Adds a runtime dependency** ("just a tiny yaml parser"). → Forbidden. Hand-roll it in
   `core/`, or stop and ask. The zero-dep constraint is a product feature.
4. **Drops `.js` from relative imports** or "fixes" the resulting error by changing
   `moduleResolution`. → Node16 ESM requires the extension. Add `.js`; never touch the
   resolution mode.
5. **Renames `add-task`-style skills** to dodge the harness's TaskCreate system-reminder. →
   LRN-002: reminder is harness noise; naming consistency across six `*-task` skills wins.
   Won't-fix, decided.
6. **Passes a plugin skill as `subagent_type`** to the Agent tool. → LRN-003: plugin skills
   run via the `Skill` tool only. `subagent_type` accepts agent definitions — built-in
   personas or plugin agents (`<plugin>:<agent>`) — never skills.
7. **Runs the flowstate integration test against a stale build** and chases a phantom bug. →
   `pnpm build` first, always.
8. **Hand-edits `.backlog/**/index.md` or entity frontmatter.** → CLI-owned. Use the flowstate
   CLI (`task-update`, `index-rebuild`, `task-move`…). `task-move` for status changes, not
   `task-update` (bit us in TSK-009).
9. **Hand-edits the `version` field in `marketplace.json`.** → Only `pnpm version:sync`
   (or the bump script that calls it) writes versions there.
10. **Pushes a tag as routine housekeeping, or thinks an untagged bump is unreleased.** → A
    `plugins/*/v*` tag push *publishes a GitHub Release*; create or push tags only when the
    user asked for a release. A bumped version pushed to `main` already reaches users
    (Claude Code installs default-branch HEAD when the version changes), so "it ships once
    you tag" is wrong. Before pushing a range that holds a version bump, say it ships (LRN-039).
11. **Writes a model-invoked skill description without trigger phrases** ("Manages tasks."). → Description
    is the invocation router; include quoted user phrases or the skill is dead weight.
12. **Silently swallows fs errors** (`catch { return [] }`). → LRN-001. Distinguish
    empty-result from lookup-failure.
13. **Uses npm or yarn.** → pnpm 10 only; CI runs `--frozen-lockfile`, a foreign lockfile
    breaks it.
14. **Adds vitest to `scripts/` tests or node:test to plugin tests.** → Framework per area is
    fixed (see Conventions in `AGENTS.md`).
15. **Treats leftover files in `dist/` as source of truth** (stale pre-rename artifacts like
    `plan-create.js` can linger). → `src/` is truth; a clean rebuild may legitimately delete
    dist files.
16. **Grants bare `Bash` in a skill, or pipes `cat` into the CLI.** → `Bash(node:*)` matches
    only commands that start with `node`; attach the heredoc to the `node` command
    (`… --body - <<'BODY'`). `scripts/lint-skills.mjs` warns on bare `Bash` (LRN-031).
17. **Hands the user a live skill test before running its CLI steps on the fixture.** →
    Preflight every CLI call the skill makes against the sandbox fixture first, and compare
    with the expected candidates. In TSK-050 the preflight found 3 detection bugs that would
    otherwise each have cost the user a manual run.
18. **Makes the user drive the sandbox by hand** (create the repo, reset, `git status`,
    `npm test`). → A skill that mutates the working tree gets a `scripts/sandbox-<skill>.mjs`
    harness: rebuild, fresh fixture, launch `claude --plugin-dir`, then check the invariants
    on exit. The user only talks to Claude. Model: `pnpm sandbox:prune-tests`; build the
    harness on `scripts/sandbox-lib.mjs` (`createGitSandbox`, `gitInvariantFailures`, `runHarness`).
19. **Tests skill edits through the installed plugin.** → This session's skills load from
    `~/.claude/plugins/cache/`, not `plugins/`. Test source with `claude --plugin-dir
    plugins/<name>`, and rebuild `dist/` first. Skills that need a clean tree cannot run in
    this repo while it has work in progress, so they run in the sandbox.
20. **Writes a runner-output parser from memory.** → Assert it against the runner's real
    default output, and paste that sample into the test. Node 24's default reporter prints
    `ℹ pass N`; TAP prints `# pass N`. Only TAP was handled, so every count read as unknown.
21. **Judges a runtime property with a static count.** → One call in a loop or table runs
    once per row, so counting calls in the source rejects valid folds. Back a static check
    with runtime evidence (the passed-case count) or scope it to where it holds.
22. **Patches files with inline `node -e` or `sed` holding nested quotes, or chains a file
    write after a fallible command.** → In `sed … && cat > f <<EOF`, a failing `sed` silently
    skips the write, and the next step builds on a file that does not exist. Use Edit, or
    write a patch script with a quoted heredoc and run it as its own command.
23. **Trims `git status --porcelain` output.** → The first line's leading space is part of
    the status code; `.trim()` shifts every path by one character. Use `.trimEnd()`.
24. **Stores a command in a shell variable** (`F="node …/flowstate.js"; $F task-list`). → The
    Bash tool runs zsh, which does not word-split `$F`: it execs one file named
    `node /…` (ENOENT, ~40 wasted calls before 3cf6e73). Store one path and run `node "$F"`;
    list several files inline, not in one string. Same shell: quote glob arguments
    (`--include='*.md'`, since zsh aborts on no match) and never start a word with `=`
    (`echo ===` fails with `=== not found`). LRN-038.
25. **Gives a hook a tool beyond bash, coreutils and `jq`.** → `fd` in
    `pre-commit-reminder.sh` broke every Bash call for users without it (6112cfc). Hooks
    run on users' machines: `find`, `grep`, `sed`, `jq` only. Quote
    `"${CLAUDE_PLUGIN_ROOT}"` in `hooks.json` commands; install paths can hold spaces.
26. **Interpolates user text into a double-quoted CLI argument.** → `--title "{{TITLE}}"`
    breaks or expands on a `$`, backtick or `"` in the user's words. See
    `docs/writing-skills.md` § Shell values (kickstart PR #6, round 3).
27. **Hands the user a step it can run itself** ("run this and paste the output", "you run
    the two commit commands"). → Run local, reversible steps yourself: commits on request,
    probes, a nested `claude -p` in a temp dir to check settings behaviour. Ask before publishing,
    before anything on the AGENTS.md ask-first list, or for credentials. The user asked "why can't you do it by
    yourself?" and "commit yourself".
28. **Pushes without checking the remote.** → `git fetch`, then show
    `git log --oneline origin/main..HEAD` before pushing. One push silently carried three
    earlier unpushed commits; the user had to ask "sync with remote main first" by hand.
29. **Leaves worktrees behind after merging parallel work.** → After merging a
    `flowstate:parallel` branch, `git worktree remove` it and delete its branch, then
    `git worktree prune`. The user asked for this cleanup in four separate sessions.
30. **Picks the bump level from the last change only.** → Read every commit since the last
    tag (`git log --oneline plugins/<name>/v<last>..HEAD -- plugins/<name>`). Any `feat`
    means minor; v2.6.3 shipped as a patch while carrying an unreleased feature.
31. **Lists one command per plugin in the root README.** → The root README lists every
    skill of every plugin, like each plugin README does; a "first command to try" table
    made dev-workflow look like a one-skill plugin (4c29a00).
32. **Briefs worktree subagents with the generic `parallel` prompt only.** → On this machine
    the rtk hook and the isolation guard refuse most git calls, and worktrees start without
    node_modules and from a stale base. `parallel` now pastes `shared/worktree-brief.md`
    into each prompt; for this repo, also add LRN-019's checklist (`pnpm build`, stage `dist/`).

## Quality bar per deliverable

Every box checked, or the deliverable isn't done. "Looks right" is not a criterion.

**CLI code change**
- [ ] `pnpm typecheck` and `pnpm test` pass from repo root
- [ ] New/changed behavior has a colocated test asserting on real file output (temp-dir sandbox)
- [ ] No new `dependencies`; no `any`; inputs are `readonly` interfaces
- [ ] Error paths use typed error classes with actionable messages and the binary's existing exit codes
- [ ] If command output changed: both `--json true` and plain modes handled, and any skill that parses this output still matches
- [ ] `dist/` rebuilt and staged (hook does it — verify it fired)

**New or edited skill**
- [ ] `pnpm lint:skills` has no errors and no new warnings (it checks: name == dir, frontmatter
      key allowlist, description ≤1024 chars / one line / ≥3 quoted triggers, body ≤150 lines,
      haiku-no-effort / sonnet+effort tiering, no bare `Bash` in `allowed-tools`,
      `${CLAUDE_PLUGIN_ROOT}` paths, CLI subcommands exist, README lists the skill).
      Exemptions live in the script, never in frontmatter
- [ ] Invocation mode chosen: user-invoked (`disable-model-invocation: true`, one-line description) or model-invoked (router description)
- [ ] `allowed-tools` is the minimal scoped set; numbered workflow steps, prerequisites checked before mutating anything
- [ ] All state mutation shells out to the plugin CLI — no hand-edited backlog/index files
      (atlassian-polish: external Jira/Confluence writes only after explicit user approval)
- [ ] Routing cases added/updated in `plugins/<plugin>/evals/routing.json` (≥3 positive, ≥2
      near-miss negative per skill); `node scripts/routing-eval.mjs` / `pnpm test` pass
- [ ] Description changed → tier-2 live run before and after, both results in the task's
      Progress Log: `claude plugin eval plugins/flowstate --case '<glob>'` (manual, costs
      model calls; a case is `evals/<case>/prompt.md` plus `graders/*.md`, LRN-011)
- [ ] `claude plugin validate plugins/<name>` passes (root `.` only checks the marketplace, LRN-009); plugin README command table updated
- [ ] Root `README.md` lists the skill too (mistake 31)
- [ ] Skill mutates the working tree → its CLI steps preflighted on the fixture, then one
      live run via `pnpm sandbox:<skill>` ends in PASS (mistakes 17–19); harnesses today:
      `sandbox:prune-tests`, `sandbox:deslop`, `sandbox:kickstart`

**Release**
- [ ] Working tree clean, on `main`, fetched and pulled; `git log --oneline origin/main..HEAD` shown
- [ ] Bump level read from every commit since the last tag (mistake 30)
- [ ] `pnpm typecheck && pnpm build && pnpm test` green *before* bumping
- [ ] Bumped via `pnpm bump`; version identical in package.json, plugin.json, marketplace.json (+ SKILL.md for flowstate)
- [ ] Commit message `chore: release <plugin> v<X.Y.Z>`; tag `plugins/<plugin>/v<X.Y.Z>`
- [ ] Tag pushed only with the user's explicit go-ahead; release workflow verified green afterwards

**Docs change**
- [ ] Correct tier (rules terse / README human / deep docs in references-docs, <300 lines)
- [ ] Every command shown is copy-paste runnable *now* (actually run it)
- [ ] Every path mentioned exists (`ls` it); no hardcoded plugin versions in READMEs
- [ ] `**/SKILL.md` treated as skill definitions, not docs — check-docs excludes them

## Releasing (mechanics)

```bash
cd plugins/<name>
pnpm bump patch            # or minor | major | x.y.z — updates every version location
cd ../..
git add -A
git commit -m "chore: release <name> v<VERSION>"
git tag plugins/<name>/v<VERSION>
git push && git push origin plugins/<name>/v<VERSION>   # only after explicit user approval — this publishes
```

`git push` alone already ships the bumped version to users (invariant 6); the tag adds the
GitHub Release. Wait on CI with `gh run watch <id> --exit-status`, not `sleep` loops.

Run `pnpm bump` without piping its output (`| head` can abort it via SIGPIPE, LRN-029).

CI (`ci.yml`) gates every PR/push to main on: typecheck, build, test, dist-drift, version-sync.
`release.yml` fires on the tag, fails if the tag version differs from `package.json`, and
creates the GitHub Release with notes built from `plugins/<name>` commits since its previous tag.
