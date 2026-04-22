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
| 🛠️ [**dev-workflow**](./plugins/dev-workflow/) | Developer workflow — smart commits, PR review, changesets, and doc audits | `1.0.2` | ✅ Stable |

> 🔭 More plugins coming soon. Contributions welcome!

---

## ⚡ Quick Start

> **Prerequisites:** [Claude Code](https://claude.ai/code) installed.

```bash
# 1. Add the marketplace
claude plugin marketplace add jmlweb/skills-monorepo

# 2. Install a plugin
claude plugin install flowstate@jmlweb
```

Then open Claude Code in any repo and run `/flowstate:setup`. See the [flowstate README](./plugins/flowstate/README.md) for full usage, commands, and installation options (team setup, manual install).

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

```text
.claude-plugin/           # Root marketplace definition
plugins/
├── flowstate/            # Backlog management plugin
│   ├── .claude-plugin/   # Plugin manifest (plugin.json) + hooks
│   ├── skills/           # Slash command definitions (*.md)
│   ├── src/              # TypeScript source
│   │   ├── commands/     # CLI command implementations
│   │   └── core/         # Shared modules (fs, paths, id, markdown…)
│   ├── dist/             # ⚠️ Pre-built — must be committed
│   └── package.json
└── dev-workflow/         # Developer workflow plugin
    ├── .claude-plugin/   # Plugin manifest
    ├── skills/           # Slash command definitions (*.md)
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
