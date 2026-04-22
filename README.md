<div align="center">

# 🧠 jmlweb · Skills Monorepo

**Marketplace and source code for production-ready [Claude Code](https://claude.ai/code) plugins.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/managed%20with-pnpm-blue?logo=pnpm)](https://pnpm.io)
[![Turbo](https://img.shields.io/badge/built%20with-Turborepo-EF4444?logo=turborepo)](https://turbo.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![ESM only](https://img.shields.io/badge/ESM-only-yellow)](https://nodejs.org/api/esm.html)

*All plugins — zero external services, zero databases, zero runtime dependencies.*

</div>

---

## 📦 Plugin Catalog

| Plugin | Description | Version | Status |
|--------|-------------|:-------:|:------:|
| 🌊 [**flowstate**](./plugins/flowstate/) | Backlog management — tasks, ideas, reports & learnings in plain markdown | `2.2.1` | ✅ Stable |

> 🔭 More plugins coming soon. Contributions welcome!

---

## ⚡ Quick Start

> **Prerequisites:** [Claude Code](https://claude.ai/code) installed.

### 1 · Add the marketplace

```bash
claude plugin marketplace add jmlweb/skills-monorepo
```

### 2 · Install a plugin

```bash
claude plugin install flowstate@jmlweb
```

### 3 · Initialize in your project

Open Claude Code in any repo and run:

```
/flowstate:setup
```

That's it. Your `.backlog/` directory is ready. 🎉

<details>
<summary>🏢 <strong>Team setup</strong> — share the marketplace across your organization</summary>

Add the marketplace to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": ["jmlweb/skills-monorepo"]
}
```

Every team member then installs individually:

```bash
claude plugin install flowstate@jmlweb
```

All backlog data lives in `.backlog/` — commit it to git and everyone shares the same source of truth.

</details>

<details>
<summary>🔧 <strong>Manual installation</strong> — for advanced users or CI environments</summary>

**Direct clone:**

```bash
git clone https://github.com/jmlweb/skills-monorepo.git ~/.claude/plugins/flowstate
```

**As a git submodule:**

```bash
git submodule add https://github.com/jmlweb/skills-monorepo.git .claude/plugins/flowstate
```

</details>

---

## 🌊 Flowstate — Backlog Management for Claude Code

> *No external services. No databases. Just files and Git.*

Flowstate turns Claude Code into a full-featured project management tool. All data is stored as **plain Markdown with YAML frontmatter** inside a `.backlog/` directory — completely git-friendly, offline-capable, and tool-agnostic.

### 🗂️ Data Model

```
.backlog/
├── tasks/
│   ├── pending/          # TSK-001-implement-auth.md
│   ├── active/           # TSK-003-fix-pagination.md
│   └── complete/         # TSK-002-setup-ci.md
├── ideas/
│   ├── pending/          # PLN-001-api-redesign.md
│   └── complete/
├── reports/
│   ├── pending/          # RPT-001-memory-leak.md
│   └── complete/
└── learnings/
    ├── index.md          # Searchable learnings index
    └── LRN-001-*/        # Individual learning entries
```

**Entity prefixes:** `TSK` · `PLN` · `RPT` · `LRN`
**Priority levels:** `P1` Critical → `P2` High → `P3` Normal → `P4` Nice-to-have

---

### 🛠️ Skills Reference

#### 🏗️ Core

| Command | Model | Description |
|---------|:-----:|-------------|
| `/flowstate:setup` | haiku | Initialize `.backlog/` structure (idempotent — safe to re-run) |
| `/flowstate:overview` | haiku | Dashboard: stats, active work, health warnings |

#### ✅ Tasks

| Command | Model | Description |
|---------|:-----:|-------------|
| `/flowstate:add-task` | sonnet | Interactively create a task with acceptance criteria & priority |
| `/flowstate:start-task <ID>` | haiku | Move task `pending → active`, load context & learnings |
| `/flowstate:complete-task <ID>` | haiku | Mark task done, extract learnings automatically |
| `/flowstate:block-task <ID>` | haiku | Block a task with a documented reason |
| `/flowstate:check-task <ID>` | haiku | Verify task status against the actual implementation |
| `/flowstate:next-task` | haiku | Smart recommendation based on priority, deps & recent work |
| `/flowstate:parallel` | sonnet | Run multiple independent tasks in isolated git worktrees |

#### 💡 Ideas

| Command | Model | Description |
|---------|:-----:|-------------|
| `/flowstate:idea` | haiku | Generate an implementation plan (explores code, identifies risks) |
| `/flowstate:review-idea <ID>` | haiku | Approve → task, discard, or revise a pending plan |

#### 🐛 Reports

| Command | Model | Description |
|---------|:-----:|-------------|
| `/flowstate:report` | haiku | File a structured bug report, finding, or security issue |
| `/flowstate:triage-report <ID>` | haiku | Convert report → task, discard it, or request more info |

#### 📚 Learnings

| Command | Model | Description |
|---------|:-----:|-------------|
| `/flowstate:add-learning` | haiku | Document an insight or lesson discovered during work |
| `/flowstate:learnings` | haiku | Browse and search the learnings index |
| `/flowstate:condense-learnings` | haiku | Deduplicate, archive stale entries, normalize tags |

---

### ✨ Smart Features

<details>
<summary>🔍 <strong>Context-aware loading</strong> — relevant info surfaced automatically</summary>

Skills like `/flowstate:start-task`, `/flowstate:next-task`, `/flowstate:idea`, and `/flowstate:parallel` automatically inject relevant context before acting:

- 📖 **Learnings** — scored by tag match + keyword relevance (deterministic CLI search)
- 🔄 **Active tasks** — detect conflicts and overlaps before starting new work
- 🚨 **Pending reports** — surface known bugs in scope

This means Claude always starts with the right context, without you having to paste anything.

</details>

<details>
<summary>🪝 <strong>Proactive hooks</strong> — automatic triggers on key events</summary>

Two shell hooks activate Flowstate automatically:

| Hook | Event | Behavior |
|------|-------|----------|
| `on-test-failure.sh` | `PostToolUse` (test failure) | Suggests `/flowstate:report` |
| `pre-commit-reminder.sh` | `PreToolUse` (commit) | Reminds to check learnings |

</details>

<details>
<summary>🌿 <strong>Parallel task execution</strong> — isolated git worktrees</summary>

`/flowstate:parallel` spawns independent git worktrees for each task, enabling safe concurrent work:

- ✅ Overlap detection before branching
- ✅ Isolated environments — no cross-task interference
- ✅ Automatic merge coordination suggestions

</details>

---

## 🏛️ Architecture

### Why file-based?

| Property | Benefit |
|----------|---------|
| 🗂️ Plain Markdown | Human-readable, editable in any editor |
| 🔀 Git-native | Full history, blame, diffs, and conflict resolution |
| 🌐 Offline-first | No API calls, no auth, no internet required |
| 🔍 Auditable | Every change is a commit — complete traceability |
| 🔌 Integrable | Any tool that reads YAML + Markdown can consume it |
| 🚀 Portable | Copy the `.backlog/` dir anywhere — it just works |

### Core principles

- **Zero runtime dependencies** — only `typescript`, `vitest`, and `@types/node` as devDeps
- **ESM only** — `"type": "module"` throughout, Node16 module resolution
- **Pre-built distribution** — `dist/` is committed; Claude Code does not run build steps on install
- **Strict TypeScript** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`
- **Idempotent operations** — every command is safe to re-run without data loss
- **Deterministic search** — learning relevance is scored, not random

---

## 🧑‍💻 Development

### Prerequisites

- **Node.js** 18+
- **pnpm** 10+

### Setup

```bash
git clone https://github.com/jmlweb/skills-monorepo.git
cd skills-monorepo
pnpm install
```

### Commands

```bash
pnpm build          # Build all plugins via Turborepo
pnpm test           # Run all test suites
pnpm typecheck      # Type-check all plugins (no emit)
pnpm version:sync   # Sync plugin.json versions → marketplace.json
```

### Repository structure

```
.claude-plugin/           # Root marketplace definition
plugins/
└── flowstate/            # Plugin source code
    ├── .claude-plugin/   # Plugin manifest (plugin.json) + hooks
    ├── skills/           # Slash command definitions (*.md)
    ├── src/              # TypeScript source
    │   ├── commands/     # CLI command implementations
    │   └── core/         # Shared modules (fs, paths, id, markdown…)
    ├── dist/             # ⚠️ Pre-built — must be committed
    └── package.json
packages/
└── shared-config/        # Shared TypeScript base config
scripts/
└── version-sync.js       # Version sync utility
```

> **⚠️ Important:** `dist/` **must be committed**. Claude Code clones the repo and does not run build steps on install.

---

### Adding a new plugin

- [ ] Create `plugins/<name>/` with:
  - `.claude-plugin/plugin.json` — manifest
  - `skills/` — slash command definitions
  - `src/` + `dist/` — TypeScript CLI (if needed)
  - `package.json`
- [ ] Add an entry to `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`
- [ ] Run `pnpm version:sync` to verify versions are in sync
- [ ] Commit the built `dist/`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** the repo
2. **Create** a feature branch: `git checkout -b feat/my-new-plugin`
3. **Commit** following [Conventional Commits](https://www.conventionalcommits.org/): `feat(flowstate): add archive command`
4. **Open** a Pull Request

Please make sure `pnpm build`, `pnpm test`, and `pnpm typecheck` all pass before submitting.

---

## 📄 License

[MIT](./LICENSE) © [jmlweb](https://github.com/jmlweb)

---

<div align="center">

Made with ❤️ for the [Claude Code](https://claude.ai/code) community

</div>
