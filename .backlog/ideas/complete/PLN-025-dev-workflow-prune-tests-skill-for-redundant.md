---
id: PLN-025
title: dev-workflow prune-tests skill for redundant tests
status: approved
created: 2026-10-15
complexity: high
reviewed: 2026-10-15
task-id: TSK-050
---


## Goal

Add a user-invoked `/dev-workflow:prune-tests` skill. It finds tests that add no value beyond other tests and shows them as a ranked candidate list with evidence for each one. It deletes only the tests the user approves. It then checks that the suite still passes and that coverage held.

A passing suite with the same coverage does **not** prove fault detection was kept (see References: Rothermel et al., Shi et al. 2018). The safety gate is the user's approval of each candidate, made with the evidence in front of them. The re-run only catches mistakes. It does not prove that deleting a test was safe.

The skill also proposes **rewrites**: changes that keep a test's checks but make the suite smaller or faster. Examples are folding repeated tests that differ only in values into one parameterised test, and replacing real sleeps with fake timers. The skill tries every rewrite and runs the affected tests before it proposes the rewrite. It never shows the user a rewrite that failed (see "Rewrite verification protocol").

## Context

- **Motivation.** Spend less CI time on tests that other tests already cover and that add nothing. A secondary benefit is less maintenance: fewer tests to update when code changes.
- **Open question.** It is not yet settled what makes a test redundant. An exploration spike (step 1) validates the criteria before the skill is written.
- **Scope.** The skill is generic and works on any repo. JS/TS runners (vitest, jest, `node:test`) get full support. Other stacks are supported on a best-effort basis through a detected test command.
- **Delivery.** Deletions and rewrites ship together in a single minor release. The skill name `prune-tests` covers both kinds.
- **Repo conventions.** The skill deletes files, so it is user-invoked: `disable-model-invocation: true`, a one-line human-facing description, and no trigger list. It is a judgment skill, so it uses `model: sonnet` and `effort: medium`.

### Candidate criteria

Names follow the Open Catalog of Test Smells where a catalog name exists. Candidates fall into two groups, because only the first group saves CI time.

**Group A: redundant. These cost runtime and are ranked by duration.**

| Criterion | Definition | Evidence required |
|---|---|---|
| Duplicate test | Same setup, same inputs and same assertions as another test. | Normalised body text matches. |
| Subsumed by mutation kills | The set of mutants this test kills is a subset of another test's set, and it covers no code that the other test leaves uncovered. | A Stryker report, used only if Stryker is already installed. This is the strongest signal (Shi et al. 2014). |
| Subsumed by coverage | The lines and branches this test covers are a subset of another test's, **and** its assertions are subsumed by that test's. Coverage alone never qualifies (Koochakzadeh & Garousi 2010; Chen et al.). | Per-test or per-file coverage, plus a judgment on whether the assertions are subsumed. |
| Trivial test | Tests only the framework, the type system or constants. | Static reading plus judgment. |

**Group B: clutter. These cost near-zero runtime and are reported separately, not ranked by time saved.**

| Criterion | Definition |
|---|---|
| Ignored Test | `.skip`, `xit`, `xdescribe`, `test.todo`, or `{ skip: true }` in `node:test`, where `git log` shows no change for **6 or more months**. |
| Empty Test / assertion-free | The test body contains no assertion call. |
| Redundant Assertion | An assertion that always passes, such as `expect(true).toBe(true)`. |

**Known false positives of the assertion-free check.** The spike must confirm these. The static scan must treat each case as "has an assertion":

- Tests whose assertion is that a call does not throw. The test body is the assertion.
- Snapshot assertions (`toMatchSnapshot`, `toMatchInlineSnapshot`).
- Assertions inside helpers defined in other files (`expectValid(x)`, shared `assert*` utilities).
- `node:assert` called through a local helper function.
- `expect.assertions(n)` or `expect.hasAssertions()` with assertions in callbacks.

### Rewrite candidates

These are established practices that cut test count, lines or runtime without removing a check. Each one maps to a named smell or pattern.

| Rewrite | Smell it fixes | Detection | Saves | Main risk |
|---|---|---|---|---|
| **Parameterised test.** Fold N tests whose bodies are the same except for literal values into one `test.each` / `it.each` table. In `node:test`, which has no `.each`, use a `for…of` loop that calls `test()`. | Test Code Duplication (Meszaros) | Static: bodies match once literals are masked. | Lines and test count. Runtime barely changes. | Readability, and failures that no longer name the case. Every row must keep a case name (`$name` / `%s`) so a failure still says which case broke ("DAMP, not DRY", Google). Don't fold bodies that differ in structure, not only in values. |
| **Fake timers instead of sleeps.** Replace a real `setTimeout` / `sleep` wait with `vi.useFakeTimers()`, `jest.useFakeTimers()` or `node:test` `mock.timers`. Or await the promise, or poll with a timeout. | Sleepy Test | Static: a sleep or timer call inside a test body. | Runtime, and it removes a source of flakiness. | Code that depends on real time (the timer behaviour itself is under test). |
| **Shared read-only fixture.** Move expensive setup that tests never change from `beforeEach` to `beforeAll`. | General Fixture, or slow setup run once per test | Static candidate, confirmed by timing. | Runtime. | Lost isolation (Beck's Test Desiderata). A test that changes the fixture makes the suite depend on test order. |
| **Runner configuration (advice only).** For vitest: `pool: 'threads'`, `isolate: false` for files that are safe without isolation, and `--shard` in CI. For jest: `--maxWorkers`. Follow each runner's own performance guide. | Not a smell; a config cost | Read the runner config. | Runtime. | Leaked state between files when isolation is off. |

Runner configuration is **advice only**. The skill never edits config files, never runs them through the verification protocol, and never lists them among the approvable R-labels. It reports them in a separate "Configuration advice" list, each with the setting, the reason and the risk.

**Excluded on purpose.** The skill does not propose a rewrite that goes against a documented project convention. For example, this repo requires real temp dirs in tests (AGENTS.md), so "replace file-system I/O with in-memory mocks" is never suggested here. Conventions are read from `AGENTS.md`, `CLAUDE.md` and `CONTRIBUTING.md`.

### Rewrite verification protocol

A rewrite reaches the user only after every check below passes.

1. **Apply it to a scratch copy.** Save the original file, apply the rewrite in the working tree, run the checks, then restore the original. The working tree is unchanged until the user approves. A git worktree does not work here because it lacks `node_modules` (LRN-014).
2. **The tests pass.** Run only the affected file, **3 times**. If any run fails, or the results differ between runs, the rewrite is dropped.
3. **Order does not matter.** For shared-fixture and isolation rewrites, run the file in shuffled order as well: `vitest --sequence.shuffle`, `jest --randomize`. A failure drops the rewrite.
4. **No check is lost.**
   - The number of test cases reported is at least the number before. For a parameterised test, it equals the number of rows, and each row maps to one original test.
   - The count of assertion calls is not lower.
   - Line and branch coverage of the files under test is unchanged.
5. **Mutation score is unchanged.** This applies only if Stryker is installed. The set of mutants killed before and after must be the same (Parsai et al.; MeteoR). This is the strongest available evidence that a test refactoring preserved behaviour.
6. **The gain is real.** For rewrites claimed to save time, compare the median duration of the 3 runs before and after. Propose the rewrite only if the saving is larger than the spread between runs. Parameterised tests are proposed for lines saved, not time, and the report says so.

### Never flagged

- The only test guarding a past bug fix. Detect this with `git log` or `git blame` on the test: the commit that introduced it is a `fix:` commit, or it references a report or issue.
- The only test of a public contract, such as an exported function or a CLI command.
- Ratchet-style tests (LRN-018: the routing rank-1 ratchet).
- Integration tests that exercise the compiled artefact, such as `flowstate.integration.test.ts`. A unit test that covers the same lines does not cover what this kind of test covers.

## Approach

1. **Exploration spike.** Validate the criteria against this repo's suites: flowstate, dev-workflow, atlassian-polish and `scripts/*.test.mjs`. Record the findings in `plugins/dev-workflow/references/test-redundancy.md`: the final criteria, the never-flag rules, false-positive examples, and the decisions below. The spike must answer these questions:
   - **Per-test coverage mechanics.** Initial research found no native per-test coverage in vitest or `node:test`. `node:test` isolates per file, not per test. **Hypothesis:** per-`it` coverage needs one isolated run per test, using a name filter (`vitest -t`, `node --test --test-name-pattern`). That multiplies runtime by the number of tests. Per-file runs are cheap. Measure both on this repo.
   - **Granularity.** If per-test runs prove too slow or unreliable, v1 works on whole files: file A subsumed by file B. Deleting individual `it` blocks without a parser is also risky. Decide here.
   - **Coverage formats for v1.** Istanbul JSON (`coverage-final.json`) and the LCOV that `node --test --experimental-test-coverage --test-reporter=lcov` produces. The Node `lcov` reporter needs v22+.
   - **Stryker.** Check that `coverageAnalysis: "perTest"` gives `coveredBy` per mutant without separate runs per test. Check what it takes to get a complete `killedBy` set. The report schema says runners may bail on the first killing test, which would fill `killedBy` with a single test. StrykerJS may need `disableBail: true`; to verify.
2. **CLI helpers for the deterministic parts.** Add these to `plugins/dev-workflow/src/commands/`:
   - `detect-test-runner`: find the runner, the test command, the coverage flag and whether Stryker is installed, using `package.json` and config files.
   - `test-static-scan`: list Group B candidates, duplicate tests, and rewrite candidates. Rewrite candidates are clusters of tests that match once literals are masked, sleep or timer calls in test bodies, and setup in `beforeEach`. One normalisation step, with literals masked or kept, serves both duplicate detection and clustering. Uses hand-rolled parsing with zero deps and applies the false-positive exclusions above.
   - `test-verify-rewrite`: take a file path, a rewritten copy and a run count. Swap the copy in, run the file N times (shuffled where asked), and restore the original. Return pass or fail per run, test-case count, assertion count and duration per run. Restoring the original happens in a `finally` block, so a crash cannot leave the rewrite in place.
   - `coverage-subsets`: take per-test or per-file coverage data and return the units whose covered lines and branches are a subset of another unit's coverage, plus each unit's duration.
   - `mutation-subsets`: take a Stryker JSON report and return the tests whose `killedBy` set is a subset of another test's set. Report "inconclusive" when the report shows bail mode.
   Wire them into `src/bin/dev-workflow.ts` with `--json true` output. Add colocated vitest tests that run on real temp dirs.
3. **Skill `skills/prune-tests/SKILL.md`.** Workflow:
   1. Detect the runner.
   2. Run the static scan.
   3. Ask for consent before the dynamic pass, and show the estimated cost (number of runs). The dynamic pass collects coverage and timing, plus the Stryker report if Stryker is installed. If the user declines, continue with the static results only.
   4. Judge whether assertions are subsumed and apply the never-flag rules. Use git history to find tests that guard bug fixes.
   5. Draft a rewrite for each rewrite candidate. Run it through the verification protocol with `test-verify-rewrite`. Drop every rewrite that fails a check, and count how many were dropped.
   6. Present the candidates as labelled blocks.
      - **Deletions (C1, C2, …).** Group A is ranked by runtime. Each block gives the criterion, the evidence (which test subsumes it, and with which signal: mutation, coverage or duplicate) and the duration. Group B follows as a separate clutter list.
      - **Rewrites (R1, R2, …).** Each block gives the smell, a short diff, the verification results (runs passed, cases and assertions before and after, mutation score if Stryker ran) and the gain: lines or median time.
      - **Configuration advice.** A plain list with no labels. It is not approvable and nothing is applied.
      - A final line shows the total time saved, and how many rewrites were dropped because they failed verification.
   7. The user approves candidates by label.
   8. Apply the approved deletions and rewrites in the working tree. Do not commit.
   9. Re-run the full suite and coverage. Restore any change that broke the suite or lowered coverage.
   10. Report the result and point to `/dev-workflow:commit`. The report states plainly that the re-run shows the suite still passes and coverage held, and that it does not show fault detection held.
4. **Docs.** Add a row to the README command table, a `/prune-tests` section and a prerequisites row. Run `pnpm lint:skills` and `claude plugin validate .`.
5. **Release.** Minor bump of dev-workflow via `pnpm bump`.

## Alternatives considered

- **Test selection or prioritisation instead of deletion.** For example `vitest --changed`, or running affected tests first (Yoo & Harman). This cuts CI time with no permanent loss and is the safer lever for runtime alone. Deletion is still wanted because redundant tests also cost maintenance. The README should mention selection as the first thing to try.
- **Pseudo-tested methods (Niedermayr; Vera-Pérez et al.).** These are code that is covered but where no test fails when the method body is removed. That is a *weak test* problem, not a redundant-test problem. It is a non-goal here, and a possible separate skill.

## Files to Modify

- `plugins/dev-workflow/references/test-redundancy.md`: new. Spike findings, final criteria, never-flag rules and false positives.
- `plugins/dev-workflow/skills/prune-tests/SKILL.md`: new skill.
- `plugins/dev-workflow/src/commands/detect-test-runner.ts` (+ `.test.ts`): new. Detects the runner, the command, coverage and Stryker.
- `plugins/dev-workflow/src/commands/test-static-scan.ts` (+ `.test.ts`): new. Detects Group B and duplicate tests.
- `plugins/dev-workflow/src/commands/coverage-subsets.ts` (+ `.test.ts`): new. Coverage subset analysis plus durations.
- `plugins/dev-workflow/src/commands/mutation-subsets.ts` (+ `.test.ts`): new. Kill-set subset analysis from a Stryker report.
- `plugins/dev-workflow/src/commands/test-verify-rewrite.ts` (+ `.test.ts`): new. Swaps in the rewrite, runs the file N times, restores the original.
- `plugins/dev-workflow/src/bin/dev-workflow.ts`: dispatch, help text and output for the five new commands.
- `plugins/dev-workflow/dist/**`: rebuilt by the pre-commit hook.
- `plugins/dev-workflow/README.md`: command table row, `/prune-tests` section and prerequisites row.
- `plugins/dev-workflow/package.json`, `.claude-plugin/plugin.json` and root `.claude-plugin/marketplace.json`: version bump.

## Risks & Considerations

- **Coverage-preserving reduction still loses fault detection.**
  - On seeded faults, Rothermel et al. found that reduced suites can be dramatically worse at finding faults.
  - On 1,478 real failed builds, Shi et al. 2018 found that reduced suites missed up to 52.2% of them. Traditional reduction metrics did not predict that loss.
  - Mitigations:
    - Prefer mutation kill sets over coverage.
    - Require assertion subsumption for coverage-based candidates.
    - Apply the never-flag rules.
    - Require explicit approval for each candidate.
    - Avoid any wording in the skill output that implies deletion is safe.
- **Per-test coverage is expensive and runner-specific.** No runner researched so far offers it natively. N isolated runs can be slow, which is why the dynamic pass is opt-in, shows its cost estimate first, and may fall back to per-file granularity.
- **Zero runtime deps.** Istanbul JSON, LCOV and the Stryker report JSON must be parsed by hand. All three are plain JSON or a line-based text format.
- **Parsing test structure** across frameworks without a parser dependency is heuristic. Keep the static checks conservative, and drop a candidate when in doubt rather than flag it.
- **Routing evals.** A user-invoked skill stays out of `evals/routing.json`. Confirm the rank-1 ratchet (LRN-018) is unaffected.
- **A rewrite can silently weaken a test.** For example, a parameterised table can drop an edge case, or a fake timer can hide a real timing bug. Mitigations:
  - Test-case and assertion counts must not drop.
  - A one-to-one mapping from rows to original tests.
  - An unchanged mutation kill set when Stryker is installed.
  - Rewrites that touch the timer behaviour under test are never proposed.
- **Timing noise.** Small speed-ups disappear in the variance between runs. Use the median of 3 runs, and drop any gain smaller than the spread between runs.
- **Skill length.** Ten steps plus two candidate kinds may break the 150-line ceiling. Move the rewrite catalog and the verification protocol into `references/test-redundancy.md` (progressive disclosure).
- **Destructive operation.** Never commit, and never touch files that are not tests. Restores must be exact: `git restore` only on files the skill changed, or a saved copy if the file already had uncommitted changes.

## Open Questions

- Coverage formats for v1: Istanbul JSON plus Node LCOV is the proposal. The spike confirms it.
- Granularity: individual `it`/`test` blocks or whole files. The spike decides, based on per-test run cost and how reliably blocks can be removed.
- Stryker's role: when Stryker is installed, kill-set subsumption is proposed as the primary signal rather than a tie-breaker. The spike confirms whether a complete `killedBy` set can be obtained, so that bail mode does not leave each mutant with a single killer. Stryker is never added as a dependency.

## References

- Yoo, S. & Harman, M. "Regression testing minimization, selection and prioritization: a survey." *STVR* 22(2), 2012. Frames minimisation as a set-cover problem; selection and prioritisation are the alternatives.
- Rothermel, G. et al. "An empirical study of the effects of minimization on the fault detection capabilities of test suites." ICSM 1998. Findings as reported by later papers (Gyori et al.; Heimdahl & George): coverage-preserving reduction can severely reduce fault detection. Contrasts with Wong et al., who found little loss.
- Shi, A., Gyori, A., Gligoric, M., Zaytsev, A., Marinov, D. "Balancing trade-offs in test-suite reduction." FSE 2014. Uses killed mutants as the reduction requirement instead of coverage.
- Shi, A., Gyori, A., Mahmood, S., Zhao, P., Marinov, D. "Evaluating test-suite reduction in real software evolution." ISSTA 2018. 1,478 failed builds from 32 projects; Failed-Build Detection Loss up to 52.2%.
- Koochakzadeh, N. & Garousi, V. "A tester-assisted methodology for test redundancy detection." 2010. Coverage-based redundancy detection yields many false positives; review by a person fixes this.
- Chen et al. 2017, "How do assertions impact coverage-based test-suite reduction?" A test detects a fault only if it executes the faulty code *and* its oracle checks the result, so coverage alone is not enough.
- Niedermayr, R., Juergens, E., Wagner, S. "Will my tests tell me if I break this code?" 2016. Vera-Pérez, O. et al. "A comprehensive study of pseudo-tested methods." *EMSE* 2019. Descartes (PITest engine). Background for the non-goal.
- Open Catalog of Test Smells: Empty Test, Ignored Test, Redundant Assertion, Duplicate Assert, Sleepy Test, General Fixture.
- Meszaros, G. *xUnit Test Patterns: Refactoring Test Code*. Addison-Wesley, 2007. Test Code Duplication smell (p. 213); parameterised tests are its standard remedy.
- Google Testing on the Toilet, "Tests Too DRY? Make Them DAMP!" (2019); *Software Engineering at Google*, "Tests and Code Sharing: DAMP, Not DRY". Keep tests readable when removing duplication.
- Fowler, M. "Eradicating Non-Determinism in Tests." Covers asynchronous waits and time; avoid bare sleeps.
- Beck, K. Test Desiderata. Isolated, deterministic, fast: the trade-off behind shared-fixture rewrites.
- Vitest, "Improving Performance" guide: pool choice, `isolate: false`, file parallelism, sharding.
- Parsai, A., Murgia, A., Demeyer, S. "Mutation Testing as a Safety Net for Test Code Refactoring." 2015. Compare mutation results before and after a test refactoring.
- Teixeira, T. et al. "MeteoR: A Tool for Monitoring Behavior Preservation in Test Code Refactorings." SBES. Mutation-based check that a test refactoring preserved behaviour, with known false negatives.
- Stryker mutation-testing-elements report schema: `killedBy` holds the ids of the tests that killed the mutant (possibly only the first when the runner bails); `coveredBy` holds the ids of the tests that covered it.
