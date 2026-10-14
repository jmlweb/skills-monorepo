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
10. **Pushes a tag as routine housekeeping.** → A `plugins/*/v*` tag push *publishes a
    release*. Never create or push tags unless the user explicitly asked for a release.
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

**Release**
- [ ] Working tree clean, on `main`, pulled
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

Run `pnpm bump` without piping its output (`| head` can abort it via SIGPIPE, LRN-029).

CI (`ci.yml`) gates every PR/push to main on: typecheck, build, test, dist-drift, version-sync.
`release.yml` fires on the tag, fails if the tag version differs from `package.json`, and
creates the GitHub Release with notes built from `plugins/<name>` commits since its previous tag.
