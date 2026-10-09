---
name: new-plugin
description: Scaffold a complete new plugin in this monorepo — directory structure, plugin.json, package.json (zero-dep, ESM), shared tsconfig, vitest, optional CLI skeleton, marketplace entry, first build, and validation. Use when the user says "new plugin", "scaffold a plugin", "add a plugin to the marketplace", or "create plugin <name>". Not for adding a skill to an existing plugin (use new-skill).
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

Done when: every listed path exists.

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

Done when: `plugin.json` has 3-6 keywords from the user.

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

Leave out the `dependencies` key: zero runtime dependencies is a product feature. Skills-only plugins keep just the `bump` script and drop
`bin`/devDeps/build scripts. CLI plugins add `"bin": { "<name>": "./dist/bin/<name>.js" }`.

Done when: `package.json` has no `dependencies` key.

### 4. CLI skeleton (only if CLI chosen)

Read `.claude/skills/new-plugin/cli-skeleton.md` and create the files it lists.

Done when: `node plugins/<name>/dist/bin/<name>.js --help` prints usage after the Step 7 build (or the plugin is skills-only).

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

Done when: the entry exists at version `0.1.0`.

### 6. README.md

README tier: human, emoji-friendly. Sections: what it is, install
(`claude plugin install <name>@jmlweb`), command table (empty for now), requirements, MIT.
No hardcoded version numbers in prose.

Done when: the README has install, command table, requirements and license sections.

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

Done when: every command in the block exits 0.

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
