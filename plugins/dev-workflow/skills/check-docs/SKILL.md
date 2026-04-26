---
name: check-docs
argument-hint: [path or scope]
description: Audit project docs (README, CLAUDE.md, AGENTS.md, package READMEs) for staleness and correctness — versions, commands, paths, examples, and instructions out of sync with the current code. Use when the user says "check docs", "are the docs up to date?", after significant code changes, or before a release. Reports content issues; defers markdown style/formatting to a linter. Monorepo-aware.
allowed-tools: Read, Edit, Write, Grep, Glob, Task, Bash(git:*), Bash(test:*)
model: sonnet
effort: medium
---

Audit documentation for content that no longer matches the codebase. Focus is **freshness and correctness** — markdown style belongs to a linter, not to this skill.

## Usage

- `/check-docs` — full audit
- `/check-docs README.md` — single file
- `/check-docs packages/foo` — single package
- `/check-docs agents` — only agent instructions (`AGENTS.md`, `CLAUDE.md`, `.claude/`)

## What to verify

For every doc in scope, compare its claims against the current repo:

- **Commands**: shell snippets and `package.json` scripts referenced in docs still exist and behave as described
- **Versions**: language/runtime/framework/dep versions match `package.json`, `engines`, `.nvmrc`, lockfiles, CI config
- **Paths**: every relative path or file reference resolves in the tree (`git ls-files`)
- **Examples**: code snippets call APIs/exports/CLIs that still exist with the documented signatures
- **Tech stack & structure**: described stack and directory layout match the actual deps and tree
- **Instructions**: setup, install, run, build, deploy steps are still accurate (smoke-check by reading the relevant code/config — do not execute)
- **Internal links**: cross-references between repo docs resolve

For agent instructions (`AGENTS.md`, `CLAUDE.md`, `.claude/**/*.md`) also check:

- Critical info up front, no contradictions, no dead pointers
- Conventions still reflected by the code (named exports, error handling style, etc.)
- Frontmatter (where applicable) is valid and up-to-date

## Workflow

1. **Resolve scope**
   - Path/file argument → audit just that
   - `agents` → `AGENTS.md`, `CLAUDE.md`, every `.claude/**/*.md`
   - No argument → all `git ls-files '*.md'`, prioritized: agent instructions → root README → package READMEs → other docs

2. **Read project conventions first** — `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/STYLE_GUIDE.md` if present. Use them to interpret intent before flagging.

3. **Detect drift per file** — extract every command, path, version, code example and internal link, then verify against the current repo (read the relevant source/config). Flag anything that no longer matches.

4. **Report findings**, grouped by severity:
   - **Critical**: wrong commands or instructions that would break a user following them
   - **High**: stale versions, broken paths, outdated install/setup steps
   - **Medium**: outdated examples, drifted structure descriptions
   - **Low**: minor wording drift, slightly out-of-date prose

   For each finding: `file:line`, what is stale, what the current state actually is, proposed fix.

5. **Apply fixes** — show the proposed diff per file and ask for confirmation before writing. Never auto-write content changes.

## Out of scope

Markdown style — trailing whitespace, missing code-fence language, heading hierarchy, table alignment, duplicate headings, line length. Don't audit, fix, or report on these. They are deterministic concerns and the project may already handle them with its own tooling (or deliberately not).

## Notes

- Preserve the user's voice and intentional formatting
- Do not invent docs where none existed (except agent instructions, with consent)
- Monorepos: audit each package independently and report per-package
- When unsure whether something is stale, report it instead of editing
- For very large doc sets, delegate per-package audits to subagents in parallel
