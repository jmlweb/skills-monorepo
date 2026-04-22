# dev-workflow

A Claude Code plugin with slash commands for the day-to-day developer workflow — committing, reviewing PRs, generating changesets, and keeping docs in shape.

## Installation

```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install dev-workflow@jmlweb
```

---

## Skills

### `/commit` — Smart commits

Analyzes staged changes, infers the commit type and scope, and generates a [Conventional Commits](https://www.conventionalcommits.org/) message for your approval.

```
/commit                          # interactive — analyzes and suggests
/commit "feat: add dark mode"    # direct message
/commit "fix(auth): token expiry"# with explicit scope
```

**What it does:**
- Detects commit type from the diff (`feat`, `fix`, `refactor`, `perf`, `docs`, `chore`…)
- Infers scope from directory structure or branch name
- Scans staged files for secrets before committing (`.env`, API keys, SSH keys…)
- Warns before committing to `main`/`master`
- Surfaces hook failures and never skips them without your permission

---

### `/changeset` — Monorepo changesets

For [Changesets](https://github.com/changesets/changesets)-managed monorepos. Detects which packages changed, picks the right semver bump, generates the changeset file, and commits everything.

```
/changeset                           # interactive
/changeset "feat: new export"        # direct message
```

**What it does:**
- Validates the `.changeset/` directory exists
- Identifies modified packages from staged files
- Classifies the bump type (`major` / `minor` / `patch`) from the nature of the changes
- Generates a randomized changeset filename (`calm-lions-dance.md`)
- Never runs `changeset version` locally — leaves that to CI

---

### `/review-pr` — PR review with parallel agents

Fetches the PR diff and launches specialized agents in parallel to produce a structured review with risk assessment.

```
/review-pr           # detects PR from current branch
/review-pr 123       # by PR number
/review-pr <url>     # by full GitHub URL
```

**What it does:**
- Always runs a **code-reviewer** for quality and conventions
- Conditionally adds a **security-reviewer** (auth, payments, env vars, DB queries)
- Conditionally adds a **qa-engineer** (critical user flows, new API endpoints)
- Checks CI status via `gh pr checks`
- Produces a full report with risk matrix and merge recommendation

> **Requires:** [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

---

### `/check-docs` — Documentation audit

Audits markdown files for freshness, formatting issues, and consistency. Fixes what it can automatically; asks before touching content.

```
/check-docs                  # full project audit
/check-docs README.md        # single file
/check-docs packages/        # specific directory
/check-docs agents           # focus on AGENTS.md / CLAUDE.md only
/check-docs --dry-run        # preview without writing
```

**What it does:**
- Validates agent instructions (`AGENTS.md`, `.claude/`) for freshness against `package.json`
- Checks formatting: code block languages, heading structure, duplicate headings, tables
- **Auto-fixes** minor issues (trailing whitespace, missing code fence language, obvious version mismatches)
- **Asks before** changing content, removing docs, or adding sections
- **Reports only** broken external links and major restructuring needs
- Monorepo-aware: checks each package independently

---

## Requirements

| Skill | Requirement |
|-------|-------------|
| `/commit` | Git |
| `/changeset` | Git + `.changeset/` directory |
| `/review-pr` | Git + GitHub CLI (`gh`) |
| `/check-docs` | Git (markdownlint optional) |

## License

MIT
