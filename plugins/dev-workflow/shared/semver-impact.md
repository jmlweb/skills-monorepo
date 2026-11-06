# Semver impact

Judge what a diff does to consumers, then compare that with the proposed title. The calling skill supplies the range (`origin/<base>...HEAD`, or `--cached` for staged changes) and the proposed title, if one exists.

A title states intent and only the diff states impact, so classify before reading the title. A wrong title can publish a wrong version.

## 1. Find the release mechanism

Check the repo for this evidence, top to bottom:

| Evidence | Mechanism | What sets the version |
|----------|-----------|-----------------------|
| `.releaserc*`, `release.config.*`, a `release` key in `package.json`, or a `semantic-release` dependency | semantic-release | Commit messages on the release branch |
| `.changeset/config.json` | Changesets | The changeset entry; compare its bump with the impact |
| `release-please-config.json`, `.release-please-manifest.json`, or a release-please CI step | release-please | Commit messages on the release branch |
| `.goreleaser.yml` or `.goreleaser.yaml` | GoReleaser | The pushed tag |
| A CI workflow triggered by pushing a tag | Tag-driven | The pushed tag |
| Only a version field in a manifest | Manual | A person editing the manifest |

Several rows match → use the one CI runs and name the others. When commit messages set the version and the repo squash-merges, the PR title is the commit that counts.

No row matches → write `Release: undetermined`, skip every statement about what the title would publish, and mark the verdict `advisory`.

## 2. Find the public surface

Use what the repo declares:

| Evidence | Public surface |
|----------|----------------|
| `package.json` `exports`, `main`, `types`, `bin` | Those entries and what they re-export |
| `pyproject.toml` or `setup.py` | `__all__`, `[project.scripts]`, importable names without a leading underscore |
| `Cargo.toml` | `pub` items reachable from the crate root |
| `go.mod` | Capitalized identifiers outside `internal/` |
| `composer.json` | Public members of autoloaded classes |
| Service or app | HTTP routes and response shapes, CLI flags and exit codes, config keys, env vars, persisted formats |

No evidence, or nothing outside the repo consumes it → write `Surface: undetermined` and mark the verdict `advisory`.

## 3. Classify from the diff

Read the diff without test files, then the test diff on its own. The most severe matching row wins.

| Diff contains | Impact | Required title |
|---------------|--------|----------------|
| Only tests, docs, tooling, CI, or behaviour-preserving restructuring | none | `test:`, `docs:`, `chore:`, `ci:`, `refactor:` |
| Behaviour corrected, every public signature identical | patch | `fix:` (`perf:` with a measurement) |
| New public name, new optional parameter, new route or flag | minor | `feat:` |
| Public name removed or renamed, parameter added as required or reordered, return type changed, default changed, documented behaviour or thrown-error contract changed incompatibly, route, flag or config key removed | **major** | `type!:` or a `BREAKING CHANGE:` footer |

Cross-checks that catch a mislabel:

- A line removed from an entry point is major unless the name is still public elsewhere.
- A changed signature line: compare it with the old one character by character.
- An existing test assertion modified, not only added: either the old assertion was wrong (say why) or the change is major. Report it either way.
- Commit types disagreeing with the diff: `fix:` commits that add a public name still need `feat:`.

When the repo's commit rules define other types, map the impact onto them. A title with no type gets the impact only.

## 4. Check drift

For each public name added, removed or renamed in the diff:

- Added: it is reachable from the entry point its siblings use, and documented where its siblings are.
- Removed or renamed: `git grep -n <name> -- '*.md'` finds no stale mention.

Stop at names from this diff. For a wider audit, suggest `/dev-workflow:check-docs`.

## 5. Report the verdict

```
Semver: <none|patch|minor|major>[ (advisory)] · Release: <mechanism|undetermined>
Title: <match|mismatch: says <x>, diff says <y>|none proposed>
Required type: <type>
Evidence: <file:line: reason, one per line>
Drift: <findings|none>
```

- Mismatch → the required type replaces the proposed one.
- `major` → stop and ask the user to confirm the breaking change before any push or title, even when the verdict is advisory or the title already declares it.

Done when: the block is printed with every field filled.
