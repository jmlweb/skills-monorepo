---
name: new-plugin
description: Scaffold a complete new plugin in this monorepo — directory structure, plugin.json, package.json (zero-dep, ESM), shared tsconfig, vitest, optional CLI skeleton, marketplace entry, first build, and validation. Use when the user says "new plugin", "scaffold a plugin", "add a plugin to the marketplace", or "create plugin <name>". Do NOT use for adding a skill to an existing plugin (use new-skill).
argument-hint: [plugin-name] [description]
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash(pnpm:*), Bash(claude:*), Bash(ls:*), Bash(mkdir:*), Bash(node:*), Bash(git:*)]
model: sonnet
effort: medium
---

# New Plugin

Create `plugins/<name>/` wired into the marketplace, turbo, pnpm workspace, and CI gates so
the first commit passes every check.

## Arguments

`$ARGUMENTS` — plugin name (kebab-case) and a one-line description.
Ask, one question at a time, for anything missing:

1. Name — kebab-case; must not collide with `plugins/*/` or an existing marketplace entry.
2. Description — one sentence, user-facing (goes in plugin.json and marketplace.json).
3. **Does it need a TypeScript CLI?** Skills-only plugins (like a prompt pack) skip
   `src/`/`dist/` entirely. CLI plugins get the full skeleton.

## Workflow

### 1. Create the structure

Skills-only:

```
plugins/<name>/
├── .claude-plugin/plugin.json
├── README.md
├── package.json
└── skills/            # empty until /new-skill adds one
```

With CLI, add: `tsconfig.json`, `vitest.config.ts`, `src/bin/<name>.ts`,
`src/commands/`, `src/core/errors.ts`.

### 2. plugin.json

```json
{
  "name": "<name>",
  "description": "<description>",
  "version": "0.1.0",
  "author": { "name": "jmlweb", "url": "https://github.com/jmlweb" },
  "repository": "https://github.com/jmlweb/skills-monorepo",
  "homepage": "https://github.com/jmlweb/skills-monorepo/tree/main/plugins/<name>",
  "license": "MIT",
  "keywords": [],
  "skills": "./skills/"
}
```

Ask the user for 3–6 keywords (they feed marketplace search).

### 3. package.json — zero-dep invariant lives here

```json
{
  "name": "@jmlweb/<name>",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "bump": "bash ../../scripts/bump-plugin.sh <name>"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

No `dependencies` key — ever. Skills-only plugins keep just the `bump` script and drop
`bin`/devDeps/build scripts. CLI plugins add `"bin": { "<name>": "./dist/bin/<name>.js" }`.

### 4. CLI skeleton (only if CLI chosen)

- `tsconfig.json`: `{ "extends": "../../packages/shared-config/tsconfig.base.json", "compilerOptions": { "outDir": "./dist", "rootDir": "./src" }, "include": ["src"], "exclude": ["**/*.test.ts"] }`
- `vitest.config.ts`: include `src/**/*.test.ts` (copy from dev-workflow).
- `src/bin/<name>.ts`: copy the dispatcher shape from
  `plugins/dev-workflow/src/bin/dev-workflow.ts` — `parseFlags` (`--key value`, bare flag →
  `"true"`), `--json true` / `--cwd` globals, exit codes 0/1/2, `--help` usage text, `switch`
  dispatch to `src/commands/*`.
- `src/core/errors.ts`: typed error classes extending `Error`.
- Command modules: `export async function cmd(cwd: string, input: Input): Promise<Result>`
  with `readonly` interfaces, colocated `*.test.ts` (vitest, temp dirs via `mkdtemp`,
  assert on real file contents).
- Imports use explicit `.js` extensions (Node16 ESM).

### 5. Marketplace entry

Add to `.claude-plugin/marketplace.json` `plugins` array:

```json
{
  "name": "<name>",
  "source": "./plugins/<name>",
  "description": "<description>",
  "version": "0.1.0",
  "keywords": [...]
}
```

### 6. README.md

README tier: human, emoji-friendly. Sections: what it is, install
(`claude plugin install <name>@jmlweb`), command table (empty for now), requirements, MIT.
No hardcoded version numbers in prose.

### 7. Wire up and verify — all must pass

```bash
pnpm install                # registers workspace package
pnpm build                  # CLI plugins: emits dist/ — this MUST be committed
pnpm typecheck && pnpm test
pnpm version:sync           # must print "All versions in sync"
claude plugin validate .
```

For CLI plugins confirm `dist/bin/<name>.js` exists and runs:
`node plugins/<name>/dist/bin/<name>.js --help`.

### 8. Report

Run the root README "Adding a new plugin" checklist and show each item checked. Remind:
first commit must include `dist/` (pre-commit hook stages it when `src/` is staged);
first release is `pnpm bump` → tag `plugins/<name>/v<version>` — tag push publishes.

## Confirmation

```
Scaffolded plugins/<name> v0.1.0 (<skills-only|with CLI>)
Marketplace: entry added, version:sync ✓
Checks:      build ✓  typecheck ✓  test ✓  validate ✓
Next:        /new-skill <name> <first-skill> — plugin ships no skills yet
```
