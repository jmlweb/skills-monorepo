---
name: check-docs
argument-hint: [path or scope]
description: Audit project docs (README, CLAUDE.md, AGENTS.md, package READMEs, docs/) for content drift AND structural fit — versions, commands, paths, examples and instructions out of sync with the code, plus a 3-tier layout check (rules stay terse, READMEs stay human, deep docs live under docs/). Use when the user says "check docs", "are the docs up to date?", after significant code changes, or before a release. Reports content + structural issues; defers markdown style/formatting to a linter. Monorepo-aware.
allowed-tools: Read, Edit, Write, Grep, Glob, Task, Bash(git:*), Bash(test:*), Bash(wc:*)
model: sonnet
effort: medium
---

Audit documentation on two axes: **freshness** (claims still match the code) and **structure** (content lives in the right tier). Markdown style belongs to a linter, not to this skill.

## Usage

- `/check-docs` — full audit (freshness + structure)
- `/check-docs README.md` — single file, both passes
- `/check-docs packages/foo` — single package, both passes
- `/check-docs agents` — only agent instructions (`AGENTS.md`, `CLAUDE.md`, `.claude/`)
- `/check-docs structure` — only the structural pass

## Scope

- Path/file argument → audit just that
- `agents` → `AGENTS.md`, `CLAUDE.md`, every `.claude/**/*.md`
- `structure` → run only the structural pass over the full doc set
- No argument → all `git ls-files '*.md'`, prioritized: agent instructions → root README → package READMEs → `docs/` → other
- **Always exclude** `**/SKILL.md` and `**/skills/**/*.md` — those are skill specs, not project documentation

Read project conventions first (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/STYLE_GUIDE.md` if present) and note the existing tier layout (which `docs/` folders exist) before flagging anything.

## Pass 1 — Freshness audit

For every doc in scope, compare its claims against the current repo:

- **Commands**: shell snippets and `package.json` scripts referenced in docs still exist and behave as described
- **Versions**: language/runtime/framework/dep versions match `package.json`, `engines`, `.nvmrc`, lockfiles, CI config
- **Paths**: every relative path or file reference resolves (`git ls-files`)
- **Examples**: code snippets call APIs/exports/CLIs that still exist with the documented signatures
- **Tech stack & structure**: described stack and directory layout match the actual deps and tree
- **Instructions**: setup, install, run, build, deploy steps are still accurate (smoke-check by reading the relevant code/config — do not execute)
- **Internal links**: cross-references between repo docs resolve

For agent instructions also check: critical info up front, no contradictions, no dead pointers, conventions still reflected by the code (named exports, error handling style, etc.), and frontmatter (where applicable) is valid.

## Pass 2 — Structural audit

Enforce a 3-tier doc layout. Caps are hard-coded.

| Tier | Files | Cap | Voice |
|---|---|---|---|
| **Rules** | `CLAUDE.md`, `AGENTS.md`, `.claude/**/*.md` | < 100 lines | terse, directive, no prose |
| **README** | `README.md` (root + per-package) | (no line cap) | human, emoji-friendly, bird's-eye view |
| **Docs** | `docs/**/*.md` (root and/or per-package) | < 300 lines/file | full technical depth, agent + human |

Per-package `docs/` (e.g. `plugins/<name>/docs/` or `packages/<name>/docs/`) is preferred. Root `docs/` is reserved for monorepo-wide topics. Both are recognized.

For each file in scope:

1. **Tier classification** by path; files outside the table are skipped by this pass.
2. **Cap check** — `wc -l` vs. tier cap. Over → finding.
3. **Voice/content check** (heuristic — flag, don't auto-rewrite):
   - Rules file with prose paragraphs, narrative tone, or extended examples → "this looks like documentation, not rules".
   - README with dense technical sections (long code blocks, deep API tables, multi-step internal procedures) → "this belongs in docs/".
4. **Index check** — if a `docs/` folder has 3+ files and no `docs/README.md` (or `docs/index.md`), flag missing index.
5. **Cross-link check** — every `docs/**/*.md` should be reachable from the index or another doc; orphans get flagged.
6. **Extraction proposal** — for each cap or voice violation, propose a concrete diff that (a) moves the offending section into a new or existing `docs/` file, (b) leaves a one-line pointer in the source. Show the diff, ask for confirmation, then write.

Severity for structural findings is **Medium** by default; **High** when a proposed pointer would be broken or a rules file exceeds its cap by >50%.

## Reporting

Group all findings (both passes) by severity:

- **Critical** — wrong commands or instructions that would break a user following them
- **High** — stale versions, broken paths, outdated install/setup, oversized rules files
- **Medium** — outdated examples, drifted structure descriptions, structural overflow, missing index
- **Low** — minor wording drift, slightly out-of-date prose, orphan docs

For each finding: `file:line`, what is wrong, what the current state actually is, proposed fix.

## Applying fixes

Show the proposed diff per file and ask for confirmation before writing. Never auto-write content changes. Same protocol for both passes.

## Out of scope

Markdown style — trailing whitespace, missing code-fence language, heading hierarchy, table alignment, duplicate headings, line length. Don't audit, fix, or report on these. They are deterministic concerns; the project may already handle them with its own tooling (or deliberately not).

## Notes

- Preserve the user's voice and intentional formatting
- Do not invent docs where none existed (except agent instructions, with consent)
- Monorepos: audit each package independently and report per-package
- When unsure whether something is stale or misplaced, report it instead of editing
- For very large doc sets, delegate per-package audits to subagents in parallel
