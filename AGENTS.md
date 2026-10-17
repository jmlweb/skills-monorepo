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
├── flowstate/                    # backlog manager: 21 skills + 1 agent + zero-dep TS CLI
│   ├── .claude-plugin/plugin.json
│   ├── SKILL.md                  # always-on context skill — carries a version: field
│   ├── skills/<name>/SKILL.md    # one dir per slash command
│   ├── agents/                   # kickstart-reviewer (read-only)
│   ├── shared/                   # prose shared by skills (grilling, kickstart templates)
│   ├── hooks/                    # hooks.json + bash hooks (need jq)
│   ├── references/               # architecture.md, plugin-docs.md, templates.md
│   ├── src/{bin,commands,core}/  # CLI source; colocated *.test.ts
│   └── dist/                     # COMMITTED build output
├── dev-workflow/                 # commit/changeset/check-docs/review-pr/prune-tests skills + CLI
│   ├── shared/commit-basics.md   # prose shared by commit + changeset skills
│   └── (same structure, no root SKILL.md, no hooks)
└── atlassian-polish/             # 2 skills + 1 agent + references + tiny CLI (md-to-adf); src/dist
packages/shared-config/           # tsconfig.base.json all plugins extend
scripts/                          # pre-commit.mjs, version-sync.js, bump-plugin.sh, sandbox-*.mjs (+ node:test tests)
GLOSSARY.md                       # ubiquitous language: entity names + words to avoid
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
pnpm lint:skills         # skill quality bar (add --strict via node scripts/lint-skills.mjs --strict)
claude plugin validate .   # marketplace + plugin schema validation
pnpm sandbox:prune-tests   # live /prune-tests run on a throwaway repo: build, Claude, invariant check
```

Live skill tests run in a sandbox harness, never by hand (playbook mistakes 17–19).

Flowstate's `src/bin/flowstate.integration.test.ts` spawns the *compiled* CLI — run
`pnpm build` before it, or it tests stale code.

## Invariants — never break these

1. **`dist/` is committed and must match `src/`** (CLI plugins only). The pre-commit hook rebuilds and stages
   `dist/` when `src/` is staged. CI fails on `git diff --exit-code -- '*/dist/**'`.
   Never edit `dist/` by hand; never gitignore it.
2. **Version sync.** `package.json`, `.claude-plugin/plugin.json`, and the plugin's entry in
   root `marketplace.json` must carry the same version — plus root `SKILL.md` frontmatter for
   flowstate. Enforced by `src/plugin.test.ts` and a CI `version:sync` diff gate.
3. **Zero runtime dependencies.** Plugin `package.json` files have *no* `dependencies` key —
   only `@types/node`, `typescript`, `vitest` as devDeps. Parsers (args, YAML frontmatter)
   are hand-rolled on purpose.
4. **ESM only, `module: Node20` + Node16 resolution.** `"type": "module"` everywhere; relative imports need
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
- When naming a backlog entity or writing skill prose, use `GLOSSARY.md` terms (and
  its _Avoid_ lists).

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
  `allowed-tools` (minimal set, prefer scoped `Bash(git:*)` over bare `Bash`), `model`, `effort`,
  `context: fork` + `background: false` (only on skills with no user questions and no
  dependence on the conversation: the subagent sees the skill text and arguments, nothing
  else; `background: false` makes the turn wait for its report).
- **Model tiering:** deterministic CRUD skills → `model: haiku`, no `effort`. Judgment skills
  (planning, triage, review, compression) → `model: sonnet` + `effort: medium` (or `high` for
  the heaviest, e.g. flowstate `idea`).
- **Description is the router.** Third person: one clause on the outcome (never steps or
  tools), then ≥3 quoted user phrases ("add task", "new task"), then "Not for X (use Y)"
  when a sibling could be confused. Shape and examples: `docs/writing-skills.md` §6.
  A vague description means the skill never fires.
- **Invocation mode.** Skills the model or another skill must reach on its own stay
  model-invoked. Skills only a user fires by hand carry `disable-model-invocation: true` and a
  one-line human-facing description (no trigger list); the trigger-phrase rule above applies to
  model-invoked skills only. No skill calls a user-invoked skill via the Skill tool.
- Body shape: `# Title` → `## Arguments` (`$ARGUMENTS`) → `## Prerequisites` → `## Workflow`
  with numbered `### N. Step` sections → confirmation output block. Length: as short as the
  behaviour allows; ceiling 150 lines.
- **Before creating or editing any SKILL.md, read `docs/writing-skills.md`** — no-op pass,
  positive phrasing, leading words, a completion criterion per step, progressive disclosure.
- Bundled files via `${CLAUDE_PLUGIN_ROOT}` (e.g.
  `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" task-create --json true`).
  Multi-line bodies via stdin: `--body -` with the heredoc attached to the `node` command
  itself (`node "…/flowstate.js" learning-create … --body - <<'BODY'`), so the command starts
  with `node` and `allowed-tools: Bash(node:*)` covers it without a prompt; a `cat … |` prefix
  would break that match. Bare `Bash` in `allowed-tools` only when the skill runs
  project-specific commands (tests, builds). `${CLAUDE_PLUGIN_DATA}` is for
  persistent state surviving updates — used only by atlassian-polish for backups; don't
  reach for it without need.
- Shared prose between skills goes in the plugin's `shared/*.md`, referenced as
  `${CLAUDE_PLUGIN_ROOT}/shared/<file>.md` — never by relative path (skills execute from the
  user's cwd, so relative paths don't resolve).

### Agents and prompt-only plugins

- Plugin agents live in `agents/<name>.md` (frontmatter: `name`, `description`, `tools`,
  `model`, `effort`). Auto-discovered — omit the `agents` key in `plugin.json`; if set, it
  must list `.md` files, a directory string fails `claude plugin validate`.
- Skills invoke them via `Agent` with `subagent_type: "<plugin>:<agent>"`. Keep agents
  side-effect-free (e.g. `tools: Read`); the skill owns writes and approvals.
- Prompt-only plugins (none today): no `src/`, `dist/`, tsconfig or devDeps; `package.json`
  keeps only the `bump` script. Turbo skips them. atlassian-polish left this class when it
  gained the `md-to-adf` CLI, so it follows the CLI rules (dist committed, zero deps).
- New plugin's marketplace entry: add it once at `0.0.0` (`version-sync.js` only updates
  existing entries), then set the real version with `pnpm bump`.

### Additions (not previously written down — follow these too)

- Before starting non-trivial work, scan `.backlog/learnings/index.md` and read any learning
  whose tags touch your task. That's what the index is for.
- Every new/renamed skill: update the plugin README's command table and run
  `claude plugin validate .` before considering it done.
- Adding, renaming or removing a flowstate skill also updates `plugins/flowstate/skills/guide/SKILL.md`
  and the `plugins/flowstate/SKILL.md` command table ("a router that lies is worse than none").
- Functions returning collections must distinguish "empty" from "lookup failed" — throw or
  validate the directory exists; never `catch → return []` (LRN-001, caused real bug RPT-003).

## Before you deliver

`docs/agent-playbook.md` holds the rest of the manual. Read the matching section at the
matching moment:

- **Named mistakes** — once, before your first edit; each entry is a trap seen in this repo
  and the rule that prevents it.
- **Quality bar per deliverable** — before reporting a CLI change, a skill, a release or a
  docs change as done. Every box checked, or it isn't done.
- **Releasing (mechanics)** — when the user asks for a release. A tag push publishes.

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

