# AGENTS.md — Operating Manual

Single source of agent guidance for this repo. `CLAUDE.md` is a symlink to this file.
Read this fully before your first edit. When this file and your instincts disagree, this file wins.

## What this repo is

A monorepo that is simultaneously:

1. A **marketplace** for Claude Code plugins (`.claude-plugin/marketplace.json` at root)
2. The **source code** for those plugins under `plugins/`

Users install with:

```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install flowstate@jmlweb
```

**Load-bearing consequence:** Claude Code *clones this repo and runs no build step*. Whatever
is committed in `plugins/*/dist/` is what users execute. This single fact explains half the
invariants below.

## Map

```
.claude-plugin/marketplace.json   # marketplace definition; versions mirrored from plugins
plugins/
├── flowstate/                    # backlog manager: 17 skills + zero-dep TS CLI
│   ├── .claude-plugin/plugin.json
│   ├── SKILL.md                  # always-on context skill — carries a version: field
│   ├── skills/<name>/SKILL.md    # one dir per slash command
│   ├── hooks/                    # hooks.json + bash hooks (need jq, fd)
│   ├── references/               # architecture.md, plugin-docs.md, templates.md
│   ├── src/{bin,commands,core}/  # CLI source; colocated *.test.ts
│   └── dist/                     # COMMITTED build output
└── dev-workflow/                 # commit/changeset/check-docs/review-pr skills + CLI
    ├── shared/commit-basics.md   # prose shared by commit + changeset skills
    └── (same structure, no root SKILL.md, no hooks)
packages/shared-config/           # tsconfig.base.json all plugins extend
scripts/                          # pre-commit.mjs, version-sync.js, bump-plugin.sh (+ node:test tests)
.backlog/                         # flowstate dogfooded on this repo (tasks, learnings, reports)
.github/workflows/                # ci.yml (PR/main gates), release.yml (tag-triggered)
```

## Commands

```bash
pnpm install               # also installs the pre-commit hook (simple-git-hooks)
pnpm build                 # turbo → tsc per plugin
pnpm test                  # vitest per plugin + node --test scripts/*.test.mjs
pnpm typecheck             # tsc --noEmit per plugin
pnpm version:sync          # plugin.json versions → marketplace.json
pnpm vitest run src/core/id.test.ts        # single test file (run inside the plugin dir)
node plugins/flowstate/dist/bin/flowstate.js <cmd> --json true   # run a CLI directly
claude plugin validate .   # marketplace + plugin schema validation
```

Flowstate's `src/bin/flowstate.integration.test.ts` spawns the *compiled* CLI — run
`pnpm build` before it, or it tests stale code.

## Invariants — never break these

1. **`dist/` is committed and must match `src/`.** The pre-commit hook rebuilds and stages
   `dist/` when `src/` is staged. CI fails on `git diff --exit-code -- '*/dist/**'`.
   Never edit `dist/` by hand; never gitignore it.
2. **Version sync.** `package.json`, `.claude-plugin/plugin.json`, and the plugin's entry in
   root `marketplace.json` must carry the same version — plus root `SKILL.md` frontmatter for
   flowstate. Enforced by `src/plugin.test.ts` and a CI `version:sync` diff gate.
3. **Zero runtime dependencies.** Plugin `package.json` files have *no* `dependencies` key —
   only `@types/node`, `typescript`, `vitest` as devDeps. Parsers (args, YAML frontmatter)
   are hand-rolled on purpose.
4. **ESM only, Node16 resolution.** `"type": "module"` everywhere; relative imports need
   explicit `.js` extensions even in `.ts` files.
5. **Strict TS via `packages/shared-config/tsconfig.base.json`**: `strict`,
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no unused locals/params.
   Do not loosen a flag to make an error go away.
6. **Releases are tag-driven.** Pushing `plugins/<name>/v<semver>` triggers
   `release.yml` → public GitHub Release. Tags are a publish action, not a bookkeeping one.
7. **Reserved names stay dead.** `plan` → `idea` and `init` → `setup` were renamed to avoid
   Claude Code's native `/plan` and `/init`. ID prefix `PLN` and dir `ideas/` stay as-is.
   Do not reintroduce the old names anywhere.

## Conventions

### Repo-wide

- Conventional Commits; scope = plugin name (`feat(flowstate): …`). Release commits:
  `chore: release <plugin> v<X.Y.Z>`.
- Docs live in three tiers (enforced by `dev-workflow:check-docs`): rules files terse
  (<100 lines), READMEs human and emoji-friendly with no length cap, deep docs in
  `references/` or `docs/` under 300 lines. Don't hardcode plugin versions in READMEs —
  they drift (this bit us; see git history).
- English for all docs and comments. Comments explain *why*, never *what*.

### CLI code

- Command module pattern: `export async function cmd(cwd: string, input: Input): Promise<Result>`
  with `readonly` interfaces. The entry point (`src/bin/*.ts`) owns arg parsing, dispatch,
  help text, and output formatting.
- Dual output: `--json true` → pretty JSON; default → tab-separated rows / `key: value` lines.
- Typed error classes (`core/errors.ts`), actionable messages. Exit codes: 0 success,
  1 findings/validation failure, 2 hard error (dev-workflow) or invariant failure (flowstate
  compression). Keep each binary's existing code meanings.
- All state mutation and ID assignment happens in the CLI — deterministic and tested.
  Skills orchestrate and exercise judgment; they never hand-edit files the CLI owns
  (entity files, `index.md` tables).
- Tests: vitest, colocated `*.test.ts`, real temp dirs (`mkdtemp` + cleanup), assertions on
  actual file contents. `scripts/*.test.mjs` use `node:test` + `node:assert/strict` instead —
  don't mix the two frameworks.

### Skills (SKILL.md)

- One directory per skill: `skills/<name>/SKILL.md`, dir name == frontmatter `name`.
- Frontmatter fields in use: `name`, `description`, `argument-hint` (optional),
  `allowed-tools` (minimal set, prefer scoped `Bash(git:*)` over bare `Bash`), `model`, `effort`.
- **Model tiering:** deterministic CRUD skills → `model: haiku`, no `effort`. Judgment skills
  (planning, triage, review, compression) → `model: sonnet` + `effort: medium` (or `high` for
  the heaviest, e.g. flowstate `idea`).
- **Description is the router.** Third person, states what the skill does, then concrete
  triggers with quoted user phrases ("add task", "new task"), and when-NOT-to-use if
  ambiguity is likely. A vague description means the skill never fires.
- Body shape: `# Title` → `## Arguments` (`$ARGUMENTS`) → `## Prerequisites` → `## Workflow`
  with numbered `### N. Step` sections → confirmation output block. House range is 60–150
  lines; hard ceiling 500.
- Bundled files via `${CLAUDE_PLUGIN_ROOT}` (e.g.
  `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --json true`).
  Multi-line bodies via stdin: `--body -` with a heredoc. `${CLAUDE_PLUGIN_DATA}` is for
  persistent state surviving updates — currently unused; don't reach for it without need.
- Shared prose between skills goes in the plugin's `shared/*.md`, referenced as
  `${CLAUDE_PLUGIN_ROOT}/shared/<file>.md` — never by relative path (skills execute from the
  user's cwd, so relative paths don't resolve).

### Additions (not previously written down — follow these too)

- Before starting non-trivial work, scan `.backlog/learnings/index.md` and read any learning
  whose tags touch your task. That's what the index is for.
- Every new/renamed skill: update the plugin README's command table and run
  `claude plugin validate .` before considering it done.
- Functions returning collections must distinguish "empty" from "lookup failed" — throw or
  validate the directory exists; never `catch → return []` (LRN-001, caused real bug RPT-003).

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
   run via the `Skill` tool only; `subagent_type` accepts built-in agent personas only.
7. **Runs the flowstate integration test against a stale build** and chases a phantom bug. →
   `pnpm build` first, always.
8. **Hand-edits `.backlog/**/index.md` or entity frontmatter.** → CLI-owned. Use the flowstate
   CLI (`task-update`, `index-rebuild`, `task-move`…). `task-move` for status changes, not
   `task-update` (bit us in TSK-009).
9. **Hand-edits the `version` field in `marketplace.json`.** → Only `pnpm version:sync`
   (or the bump script that calls it) writes versions there.
10. **Pushes a tag as routine housekeeping.** → A `plugins/*/v*` tag push *publishes a
    release*. Never create or push tags unless the user explicitly asked for a release.
11. **Writes a skill description without trigger phrases** ("Manages tasks."). → Description
    is the invocation router; include quoted user phrases or the skill is dead weight.
12. **Silently swallows fs errors** (`catch { return [] }`). → LRN-001. Distinguish
    empty-result from lookup-failure.
13. **Uses npm or yarn.** → pnpm 10 only; CI runs `--frozen-lockfile`, a foreign lockfile
    breaks it.
14. **Adds vitest to `scripts/` tests or node:test to plugin tests.** → Framework per area is
    fixed (see Conventions).
15. **Treats leftover files in `dist/` as source of truth** (stale pre-rename artifacts like
    `plan-create.js` can linger). → `src/` is truth; a clean rebuild may legitimately delete
    dist files.

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
- [ ] Frontmatter complete; `name` == directory name; `allowed-tools` is the minimal scoped set
- [ ] Model tier follows the CRUD-haiku / judgment-sonnet+effort rule
- [ ] Description contains ≥3 quoted trigger phrases and states when to use it
- [ ] Body ≤150 lines, numbered workflow steps, prerequisites checked before mutating anything
- [ ] All state mutation shells out to the plugin CLI — no hand-edited backlog/index files
- [ ] `claude plugin validate .` passes; plugin README command table updated

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

## When uncertain — escalation rules

- **Fact about this repo** (does X exist, how does Y behave): read the code and its tests.
  Tests are the spec. Never answer from memory of "typical" projects.
- **Claude Code plugin schema doubt** (frontmatter field, hooks event, manifest key): check
  `plugins/flowstate/references/plugin-docs.md` first, then official docs. Never invent fields.
- **Two designs, both within conventions:** pick the simpler zero-dependency one, note the
  road not taken in your summary. Don't ask.
- **Ask the user first — always — before any of:** adding a dependency; renaming or removing
  a published skill/command; changing ID formats, tag format, or exit-code meanings; deleting
  backlog entities; pushing tags or anything that publishes; force-pushes or history edits.
- **Intent ambiguity** (which plugin? patch or minor?): ask one concrete question with a
  recommendation attached — not an open-ended menu.
- **A skill breaks while you're using it:** fix it, then continue the original task. Never
  just report it broken.
- **Something you were told contradicts what the code shows:** stop and surface the conflict
  before proceeding on either version.

## Releasing (mechanics)

```bash
cd plugins/<name>
pnpm bump patch            # or minor | major | x.y.z — updates every version location
cd ../..
git add -A
git commit -m "chore: release <name> v<VERSION>"
git tag plugins/<name>/v<VERSION>
git push && git push --tags        # only after explicit user approval — this publishes
```

CI (`ci.yml`) gates every PR/push to main on: typecheck, build, test, dist-drift, version-sync.
`release.yml` fires on the tag and creates the GitHub Release with generated notes since the
plugin's previous tag.
