---
name: prune-tests
argument-hint: [path or package]
description: Finds tests that add nothing beyond other tests and proposes verified rewrites; deletes or rewrites only what you approve.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(node:*), Bash(git:*), Bash(mktemp:*), Bash(cp:*), Bash(mkdir:*), Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(yarn:*)
model: sonnet
effort: medium
---

# Prune Tests

Find redundant and clutter tests, propose rewrites that keep every check, and apply only what the user approves. Criteria, never-flag rules, the rewrite catalog and the verification protocol are in `${CLAUDE_PLUGIN_ROOT}/references/test-redundancy.md`. Read its sections 2 to 6 at the matching step.

The CLI is run as `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" <command>`.

## Arguments

`$ARGUMENTS` names a package directory. Empty means the repo root. Scope every command to it with `--cwd`.

## Prerequisites

Run `git status --porcelain` in the target directory. The working tree must be clean: restores use `git checkout`, which is only safe when the tree had no uncommitted changes to lose.

If the tree is dirty, stop and tell the user to commit or stash first. Do not continue.

Done when: `git status --porcelain` prints nothing.

## Workflow

### 1. Detect the runner

Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" detect-test-runner --cwd <dir> --json true`.

If `runner` is `unknown`, stop and ask the user for the test command. Use it as `testCommand`, with `{file}` as the placeholder for a test file path.

Done when: `runner`, `testCommand` and `suiteCommand` are known.

### 2. Static scan

Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" test-static-scan --cwd <dir> --json true`. Read the counts and keep the JSON for steps 4 and 5.

Done when: the report is in hand and you have stated the counts: assertion-free, trivial, skipped, duplicate groups, parameterisable groups, sleep tests.

### 3. Ask for the dynamic pass

The dynamic pass runs every test file once for coverage, and once more with Stryker if it is installed. Estimate the cost first: test files × 1 runs for coverage, plus one full Stryker run. Ask the user yes or no and state the estimate.

- If `coverageProvider` is null and `stryker` is false, skip this step and say that only the static candidates will be shown.
- If the user declines, skip this step and continue with the static results.

Done when: the user has answered yes or no.

### 4. Collect coverage and subsets (if approved)

For each test file from the scan, run `coverageCommand` with `{file}` replaced by the file and `{dir}` replaced by `<scratch>/cov/<n>`, where `<scratch>` comes from `mktemp -d`. Write `<scratch>/units.json`: an array of `{id, durationMs, coverage}`, where `coverage` is `coverage-final.json` or `lcov.info` inside that directory.

Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" coverage-subsets --units <scratch>/units.json --json true`.

If Stryker is installed and the user approved it, run `pnpm exec stryker run --disableBail` (or the matching package manager) and then `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" mutation-subsets --report <report path> --json true`. Read the `bailSuspected` flag. If it is `true`, drop the mutation subsets and say so.

Done when: `coverage-subsets` and, if run, `mutation-subsets` have reported.

### 5. Judge candidates

For each candidate from the scan's duplicates, assertion-free and trivial lists, and from the subset commands:

- Read both test bodies.
- Confirm assertions are subsumed: the kept test checks at least what the dropped one checks.
- Apply every never-flag rule in `references/test-redundancy.md` section 3. Run `git log --format=%s -- <file>` to check for `fix:` commits.
- Drop the candidate if any rule applies or if you are unsure. Note each dropped candidate and why.

Done when: every candidate is either kept for the report, with its evidence, or dropped with a reason.

### 6. Draft and verify rewrites

For each parameterisable group, sleep test and shared-fixture candidate:

1. Write the rewritten file to `<scratch>/rewrite-<n>/<basename>` with the same structure rules as `references/test-redundancy.md` section 4. Never change what a test checks.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/dev-workflow.js" test-verify-rewrite --cwd <dir> --file <test file> --rewritten <rewritten copy> --command '<testCommand as JSON array>' --shuffle-args '<shuffleArgs as JSON array>' --runs 3 --json true`. When `coverageCommand` is not null, add `--coverage-command '<coverageCommand as JSON array>'`. Add `--claim time` for sleep and fixture rewrites, and `--claim fold` for parameterised tables; for a fold, confirm each row maps to one original test.
3. Keep the rewrite only if `verdict` is `pass`. Count the dropped ones. Never show a failed rewrite.

The command restores the original file itself. Confirm `git status --porcelain` is still empty after each call.

Done when: every rewrite has a `pass` or a counted drop, and the working tree is clean again.

### 7. Present the candidates

Show, in this order:

- **Deletions** as `C1`, `C2`, … Group A ranked by duration, each with its criterion, its evidence (subsuming test and signal) and its duration.
- **Clutter** as a separate section of Group B items, continuing the `C` numbering, not ranked by time.
- **Rewrites** as `R1`, `R2`, … Each with the smell, a short diff, the verification results (runs passed, cases, assertions and coverage before and after) and the gain in lines or median time.
- **Configuration advice** as an unlabelled list. It is never applied.
- A footer: time saved by all deletions and rewrites together, and the number of rewrites dropped.

Then say plainly: a passing suite with the same coverage does not show that fault detection was kept.

Ask the user which labels to apply, for example `C1 R2`, or `none`.

Done when: the user has replied with labels or `none`.

### 8. Apply the approved items

Apply only the approved labels, in the working tree. Never stage or commit.

When two or more approved rewrites change the same file, merge them into one copy first and run `test-verify-rewrite` on the merged copy with the step 6 flags (`--claim fold` if any part is a fold, otherwise `--claim lines`). If it fails, apply none of that file's rewrites and say so. Apply that file's approved deletions after the rewrites.

- Deleting a whole test file: remove the file.
- Removing a block (duplicate, trivial, assertion-free or ignored test): read the file, then remove the block text with Edit. For a duplicate, keep the copy that the evidence names as the survivor.
- Applying a rewrite: copy the verified rewritten file, or the verified merged copy, over the test file.

Done when: each approved label is applied and no unapproved file has changed (`git status --porcelain` shows only the approved files).

### 9. Re-run the suite and coverage

Run `suiteCommand` in the target directory. If coverage ran in step 4, also run the coverage command for the whole suite and compare with the pre-change totals.

If the suite fails, or coverage fell, restore the change that caused it: `git checkout -- <file>` for each file that changed. Then re-run and state which change was restored and why.

Done when: the suite passes, and any item that broke it has been restored.

### 10. Report

State the result in four lines or fewer:

- Applied: the labels that stayed.
- Restored: any label undone after the re-run, with the reason.
- Dropped: the number of rewrites that failed verification.
- Next step: review with `git diff`, then `/dev-workflow:commit`.

State that the re-run shows the suite passes and coverage held. It does not show fault detection held.

Done when: the report is printed and the working tree holds only the approved changes.
