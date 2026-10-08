# 🛠️ dev-workflow

> A Claude Code plugin with slash commands for the day-to-day developer workflow — committing, reviewing PRs, generating changesets, and keeping docs in shape.

## Installation

```bash
claude plugin marketplace add jmlweb/skills-monorepo
claude plugin install dev-workflow@jmlweb
```

---

## Skills

### ✍️ `/commit` — Smart commits

Analyzes staged changes, infers the commit type and scope, and generates a [Conventional Commits](https://www.conventionalcommits.org/) message for your approval.

```bash
/commit                           # interactive — analyzes and suggests
/commit "feat: add dark mode"     # direct message
/commit "fix(auth): token expiry" # with explicit scope
```

**What it does:**
- 🔍 Detects commit type from the diff (`feat`, `fix`, `refactor`, `perf`, `docs`, `chore`…)
- 🌿 Infers scope from directory structure or branch name
- 🔐 Scans staged files for secrets before committing (`.env`, API keys, SSH keys…)
- ⚠️ Warns before committing to `main`/`master`
- 🪝 Surfaces hook failures and never skips them without your permission

---

### 📦 `/changeset` — Monorepo changesets

For [Changesets](https://github.com/changesets/changesets)-managed monorepos. Detects which packages changed, picks the right semver bump, generates the changeset file, and commits everything.

```bash
/changeset                    # interactive
/changeset "feat: new export" # direct message
```

**What it does:**
- ✅ Validates the `.changeset/` directory exists
- 📂 Identifies modified packages from staged files
- 🏷️ Classifies the bump type (`major` / `minor` / `patch`) from the nature of the changes
- 🎲 Generates a randomized changeset filename (`calm-lions-dance.md`)
- 🚫 Never runs `changeset version` locally — leaves that to CI

---

### 🔎 `/review-pr` — PR review with parallel agents

Fetches the PR diff and launches specialized agents in parallel to produce a structured review with risk assessment.

```bash
/review-pr        # detects PR from current branch
/review-pr 123    # by PR number
/review-pr <url>  # by full GitHub URL
/review-pr --all  # also show Nice to Have and Info findings
```

**What it does:**
- 🧑‍💻 Always runs a **code-reviewer** for quality and conventions
- 🔒 Conditionally adds a **security-reviewer** (auth, payments, env vars, DB queries)
- 🧪 Conditionally adds a **qa-engineer** (critical user flows, new API endpoints)
- 📏 **Standards axis**: repo rules plus a code-smell baseline (Fowler smells, judgement calls, repo standards win)
- 🎯 **Spec axis**: a general-purpose agent checks the diff against the originating task's acceptance criteria (missing or partial, scope creep, wrongly implemented), quoting each criterion
- 🔗 Spec is found via a task/report ID (`TSK-`/`RPT-`) in branch, title, body or commits, then a local `.backlog/` task file, then the PR body or linked issue; with none, the Spec axis is skipped ("no spec available"). Works without flowstate
- ✅ Checks CI status via `gh pr checks`
- 📋 Produces a full report with risk matrix and merge recommendation
- ⚖️ The two axes are reported in separate sections, each with its own worst finding, never merged or re-ranked
- 🔢 Numbers findings (`#1`, `#2`, …) across all agents and both axes as `path:line: severity: finding`
- 🎯 Shows only **Critical, Must Fix and Should Fix** by default; `--all` adds Nice to Have and Info
- 📄 The full unfiltered report is always written to `review.md`
- 💬 Posts only the findings you pick, as one review with inline comments, after you confirm the exact text (lines outside the diff go into the review body)

> **Requires:** [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

---

### 🚦 `/ci-triage` — Explain a red CI run

Classifies each failure of a failed GitHub Actions run as **real**, **flaky** or **infra**, with evidence, and recommends one action per failure.

```bash
/ci-triage        # latest failed run on the current branch
/ci-triage 123    # by PR number
/ci-triage <url>  # by run URL
```

**What it does:**
- 📜 Fetches only the failing jobs and steps via `gh run view --log-failed`
- 🧭 Real → points at `file:line` and the likely commit; flaky → compares with base-branch history; infra → matches runner/network/registry signatures
- 🔁 Suggests `gh run rerun --failed` or one deduped issue per flaky test
- 🙋 Read-only until you confirm any rerun or issue creation

> **Requires:** [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

---

### 🚀 `/open-pr` — Open a PR people want to read

Turns the current branch into a pull request. The description is written from your PR template by a read-only `pr-writer` agent: why first, plain words, no file-by-file changelog.

```bash
/open-pr                          # draft PR against the default branch
/open-pr --ready                  # regular PR instead of a draft
/open-pr --base develop           # another target branch
/open-pr --template docs/pr.md    # use a specific template file
```

**What it does:**
- 🛫 Preflight: `gh` authenticated, not on the base branch, commits ahead, no PR already open (then it points you to `/pr-ready`)
- 🔐 Scans every commit in `<base>...HEAD` for secrets and sensitive files; stops on findings
- 🧩 Resolves the template (see below) and suggests a Conventional Commits scope for the title
- 👀 Shows title and body and waits for you to approve, edit or cancel
- 📤 Only then runs `git push -u` and `gh pr create --draft`
- 🔒 Never force-pushes, never creates anything before you say yes

> **Requires:** [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

---

### 🧾 PR templates

`/open-pr` and `/pr-ready` pick the first template that exists:

1. **Your repo's template** — GitHub's standard locations: `.github/pull_request_template.md`, then `docs/`, the repo root, or a `PULL_REQUEST_TEMPLATE/` folder. If several match, you are asked which one.
2. **Your personal default** — `pr-template.md` in the plugin's data directory.
3. **Built-in** — Why / What changed / How to test / Notes for reviewers.

**How a template is read:**

| In the template | What happens |
|:----------------|:-------------|
| `## Heading` | A section; kept in order |
| `<!-- ... -->` under a heading | An instruction for the writer; removed from the output |
| `<!-- optional ... -->` | The section is dropped when it does not apply |
| Section without `optional` | Always kept, `N/A` if there is nothing to say |
| `- [ ]` checklist items | Copied as written, never ticked |

**Example:**

```markdown
## Why
<!-- The problem in two sentences. Link the ticket instead of retelling it. -->

## Screenshots
<!-- optional: only for UI changes -->

## Checklist
- [ ] Tests added
- [ ] Docs updated
```

**Set a personal default:** save your template as `pr-template.md` in the plugin data directory (`~/.claude/plugins/data/dev-workflow-jmlweb/` on a standard install). Run `/open-pr` once; it reports which template source it used, so you can confirm. Repo templates always win over it.

The writing rules live in `references/pr-style-guide.md`.

---

### ✅ `/pr-ready` — Get your PR mergeable

Drives your own open PR to a mergeable state: updates the branch, triages red CI, handles unresolved review threads, trims the description, and requests reviewers.

```bash
/pr-ready          # PR of the current branch
/pr-ready 123      # by PR number
/pr-ready --merge  # also merge once CI is green
```

**What it does:**
- 🔄 Merges the base branch in; stops and asks on conflicts
- 🚦 On red CI, hands off to `/ci-triage`
- 💬 Splits unresolved review threads into *fixable* and *needs you*, fixes the first group within your branch diff
- 🙋 Posts one-line replies and resolves threads only after you confirm
- ✂️ Rewrites the PR body through your [PR template](#-pr-templates) so it reads well and stays lean
- 🔒 Never merges without `--merge`, never pushes to the base branch, never force-pushes without asking

> **Requires:** [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

---

### 🤝 `/agent-handoff` — Multi-repo agent handoffs

Standardizes work split across repos and run by parallel agents: writes one self-contained prompt per target repo, then reconciles the reports that come back.

```bash
/agent-handoff out   # one prompt per target repo, from the current context
/agent-handoff in    # paste the original handoff + the agent report to reconcile
```

**What it does:**
- 📨 `out`: fixed sections per prompt: goal, links, constraints, decisions made, done-criteria, and a short report-back block
- 🌿 Names a branch (never a worktree or local path) and keeps secrets and machine-local paths out of prompts
- 🔍 `in`: lists what is **done**, **open** and **contradicted**, then prints follow-up handoffs if work remains
- 🧼 Stateless — both inputs are pasted, so it works after `/clear`
- 🔒 Read-only: writes no files and touches no tracker
- ⚠️ `in` compares text claims only; it cannot verify state in other repos, so it tells you how to check each claim

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

## Requirements

| Skill | Requirement |
|:------|:------------|
| `/commit` | Git |
| `/changeset` | Git + `.changeset/` directory |
| `/review-pr` | Git + GitHub CLI (`gh`) |
| `/ci-triage` | Git + GitHub CLI (`gh`) |
| `/open-pr` | Git + GitHub CLI (`gh`) |
| `/pr-ready` | Git + GitHub CLI (`gh`) |
| `/agent-handoff` | None (no external CLI) |
| `/check-docs` | Git |

## License

MIT
