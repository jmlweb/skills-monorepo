---
name: release-plugin
description: Run the full release flow for a plugin in this monorepo — preflight checks, version bump, release commit, tag, push, and post-release verification. Use when the user says "release flowstate", "cut a release", "ship a new version", "bump and tag", or "publish dev-workflow". Do NOT use for changesets in other repos (that's dev-workflow:changeset) or for committing regular work.
argument-hint: [plugin] [patch|minor|major|x.y.z]
allowed-tools: [Read, Grep, Bash(git:*), Bash(pnpm:*), Bash(gh:*), Bash(node:*), Bash(ls:*)]
model: sonnet
effort: medium
---

# Release Plugin

Release a plugin end-to-end: verify the repo is releasable, bump every version location
atomically, commit, tag with `plugins/<name>/v<semver>`, push after explicit confirmation,
and verify the GitHub Release was created.

## Arguments

`$ARGUMENTS` — optional plugin name and bump type, e.g. `flowstate minor` or `dev-workflow 2.0.0`.

- If the plugin is missing, list `plugins/*/` and ask which one.
- If the bump type is missing, infer it from commits since the plugin's last tag
  (`git log $(git tag --sort=-version:refname | grep "plugins/<name>/" | head -1)..HEAD -- plugins/<name>`):
  any `feat` → `minor`, only `fix`/`chore`/`docs`/`refactor` → `patch`, any `!`/`BREAKING CHANGE` → `major`.
  State the inference and the commits that drove it; ask only if the log is empty or mixed in a
  way that makes the choice genuinely unclear.

## Prerequisites — abort with the reason if any fails

1. `git status --porcelain` is empty (clean tree — a release commit must contain only the bump).
2. Current branch is `main` and `git pull --ff-only` succeeds.
3. `plugins/<name>/` exists and has `.claude-plugin/plugin.json`.

## Workflow

### 1. Preflight — green before touching versions

```bash
pnpm typecheck && pnpm build && pnpm test
```

If anything fails, stop and report the failure verbatim. Never bump on a red build.

After the build, confirm `git status --porcelain` is still empty. If `dist/` changed, the
committed dist was stale — stop and tell the user; that drift must be committed separately
(as its own `fix`/`chore` commit) before releasing.

### 2. Bump

```bash
cd plugins/<name> && pnpm bump <patch|minor|major|x.y.z>
```

This updates `package.json`, `.claude-plugin/plugin.json`, root `SKILL.md` (if present),
and root `.claude-plugin/marketplace.json` via version-sync. Never edit any of these by hand.

### 3. Verify the bump landed everywhere

Read the new version `V` from `plugins/<name>/package.json`, then grep for it in:

- `plugins/<name>/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (the entry for this plugin)
- `plugins/<name>/SKILL.md` frontmatter — flowstate only

All must match. Also run `pnpm --filter <pkg> test` if the plugin has a `plugin.test.ts`
version-sync test (flowstate does). Mismatch → stop, report which file is off.

### 4. Commit and tag

```bash
cd <repo root>
git add -A
git commit -m "chore: release <name> v<V>"
git tag plugins/<name>/v<V>
```

Confirm the tag doesn't already exist first (`git tag -l 'plugins/<name>/v<V>'`).

### 5. Push — requires explicit confirmation

Pushing the tag **publishes a GitHub Release** via `release.yml`. Show the user:
version, tag name, and `git log --oneline <prev-tag>..HEAD -- plugins/<name>` as the
release content. Ask for an explicit go-ahead, then:

```bash
git push && git push --tags
```

If the user declines, stop here and tell them commit + tag exist locally and how to undo
(`git tag -d plugins/<name>/v<V>` + `git reset --hard HEAD~1`).

### 6. Post-release verification

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <run-id> --exit-status
gh release view plugins/<name>/v<V>
```

Report the release URL. If the workflow fails, fetch the failing step's log
(`gh run view <run-id> --log-failed`) and report it — do not delete or re-push tags to retry
without the user's decision.

## Confirmation output

```
Released <name> v<V>
Tag:      plugins/<name>/v<V>
Release:  <github release url>
CI:       release.yml ✓
```
