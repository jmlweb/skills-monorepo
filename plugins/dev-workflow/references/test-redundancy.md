# Test redundancy: criteria, spike findings and verification

Deep reference for `/dev-workflow:prune-tests`. The skill reads this file at the judgment steps (never-flag rules, rewrite catalog, verification protocol). Terms follow `GLOSSARY.md`.

A passing suite with the same coverage does **not** prove that fault detection was kept. Reduced suites can miss real failures that full suites catch (Rothermel et al. 1998; Shi et al. 2018 found up to 52.2% of failed builds missed). The user's approval of each candidate, made with the evidence in front of them, is the safety gate. The re-run after applying only catches mistakes.

## 1. Spike findings

Measured on this repo, Node 24.13, pnpm workspace.

| Question | Finding |
|---|---|
| Suite size | flowstate 269 test blocks in 35 files; dev-workflow 81 in 6; atlassian-polish 37 in 4; `scripts/` 83 in 9 `node:test` files. vitest reports 280 for flowstate because `it.each` expands into several cases. |
| Per-file isolated run cost | One vitest invocation for one file: about 0.38 s wall (dev-workflow, `detect-packages.test.ts`). Whole flowstate suite: 3.9 s wall. |
| Per-test isolated run cost | `vitest run <file> -t "<name>"` works (1 passed, 7 skipped, verified). Each invocation pays the same ~0.4 s startup, so 269 isolated runs cost about 110 s before any test runs. Extrapolated, not measured end to end. |
| Per-file vs per-test cost | 35 file runs about 14 s extrapolated; 269 test runs about 110 s. Per-test coverage is about 8x the cost of per-file, with no native runner support. |
| Granularity decision | **File-level for coverage-based deletions in v1.** Per-test coverage costs too much. Block-level deletion is allowed only for exact-duplicate blocks found by the static scan, and each one needs the user's approval. |
| Node LCOV | `node --test --experimental-test-coverage --test-reporter=lcov` over `scripts/*.test.mjs` runs in 2.35 s wall and writes 52 `SF:` records. Output is standard LCOV (`DA:`, `BRDA:`). Requires Node 22+, which matches the plugin's `engines`. |
| Vitest coverage | **Not measured.** No coverage provider (`@vitest/coverage-v8` or `@vitest/coverage-istanbul`) is installed in this repo. Installing one is a new dependency and needs the user's approval. `detect-test-runner` reports the provider's absence. `coverage-subsets` cannot run in this repo until one is installed. |
| Istanbul JSON | Parsed by `coverage-subsets` from `coverage-final.json`. Parser is covered by fixture tests. Not measured against a real vitest coverage run here. |
| Stryker | **Not installed; not added.** Facts below come from the StrykerJS docs (Context7, `/stryker-mutator/stryker-js`), not from a run here. |

Stryker facts relied on:

- `coverageAnalysis: "perTest"` is the default. Stryker's own runner records which tests cover each mutant in one initial run, so per-test isolated runs are not needed when Stryker is present.
- `disableBail` defaults to `false`. With bail, `killedBy` holds only the first failing test per mutant, which hides every other killer. Set `disableBail: true` to get a complete `killedBy` set. Jest always bails inside Stryker, and only reports every failing test when `disableBail` is `true`.
- `mutation-subsets` detects bail mode when every killed mutant has at most one killer, and marks its output `bailSuspected`.

Stryker's `killedBy` and `coveredBy` are the strongest available signal for subsumption. Coverage alone is a weak one.

## 2. Criteria

Names follow the Open Catalog of Test Smells where a catalog name exists.

**Group A: redundant.** These cost runtime. Ranked by time saved.

| Criterion | Definition | Evidence required |
|---|---|---|
| Duplicate test | Same setup, inputs and assertions as another test. | `test-static-scan` `duplicates`: normalised body text matches exactly. |
| Subsumed by mutation kills | A test's kill set is a subset of another test's kill set, and it covers no mutant that the other misses. | `mutation-subsets` on a Stryker report with `disableBail: true`. Strongest signal. |
| Subsumed by coverage | A test file's covered lines and branches are a subset of another file's, **and** its assertions are subsumed by that file's. Coverage alone never qualifies. | `coverage-subsets` plus a judgment on the assertions. |
| Trivial test | Tests only the framework, the type system or constants. | `test-static-scan` `trivialAssertion` plus a read of the body. |

**Group B: clutter.** These cost near-zero runtime. Reported in a separate list, not ranked by time saved.

| Criterion | Definition |
|---|---|
| Ignored test | `.skip`, `xit`, `xdescribe`, `test.todo` or `{ skip: true }`, where git shows no change to the file for 6 months or more (`staleSkip`). |
| Assertion-free | The body has no assertion call. The scan's check is conservative: see false positives below. |
| Redundant assertion | An assertion that always passes, such as `expect(x).toBe(x)`. |

**Known false positives of the assertion-free check.** The scan treats each as "has an assertion". Confirm each one by reading the body before listing it.

- A test whose assertion is that a call does not throw. The test body is the assertion. The scan can flag these, because it sees no `expect` call.
- Snapshot assertions (`toMatchSnapshot`, `toMatchInlineSnapshot`). Treated as assertions.
- Assertions inside a helper defined in another file. A call named `assert*`, `expect*`, `verify*`, `ensure*`, `check*` or `validate*` counts as an assertion. Other helper names are not recognised and will be flagged.
- `node:assert` through a local alias. Recognised only when the call starts with `assert`.
- `expect.assertions(n)` or `expect.hasAssertions()` with assertions in callbacks. The scan sees the `expect` call and does not flag it.

**Parameterised tests** (`it.each`, `test.each`) are never analysed for duplication or assertions. They are counted but not judged.

## 3. Never flag

Skip a candidate if any of these holds, even when the evidence says redundant:

- **Guards a past bug fix.** `git log --format=%s -- <file>` shows a `fix:` commit or cites a report, issue or `RPT-` ID, and the test is the only one that touches that behaviour.
- **Sole test of a public contract.** An exported function, a CLI command or a published skill has no other test.
- **Ratchet tests.** Tests that pin a measured value, such as the routing rank-1 ratchet in `scripts/routing-eval.mjs` (LRN-018).
- **Integration tests that run the compiled artefact.** For example `flowstate.integration.test.ts`, which spawns `dist/`. A unit test covering the same lines does not cover what this kind of test covers.
- **Tests that exercise a documented project convention.** Read `AGENTS.md`, `CLAUDE.md` and `CONTRIBUTING.md`. For example, this repo requires real temp dirs in tests, so an in-memory mock rewrite is never proposed here.

## 4. Rewrite catalog

Rewrites keep a test's checks and make the suite smaller or faster. Each maps to a smell or pattern. Every rewrite passes the verification protocol before it is shown.

| Rewrite | Smell it fixes | Detection | Saves | Main risk |
|---|---|---|---|---|
| **Parameterised test.** Fold N tests whose bodies differ only in literal values into one `it.each` / `test.each` table. In `node:test`, which has no `.each`, use a `for…of` loop that calls `test()`. | Test Code Duplication (Meszaros) | `test-static-scan` `parameterisable`: bodies match once literals are masked. | Lines and test count. Runtime barely changes. | Failures stop naming the case. Every row keeps a case name (`$name` or `%s`) so a failure still says which case broke. Do not fold bodies that differ in structure. |
| **Fake timers instead of sleeps.** Replace a real `setTimeout` or `sleep` wait with `vi.useFakeTimers()`, `jest.useFakeTimers()` or `mock.timers`. Or await the promise, or poll with a timeout. | Sleepy Test | `test-static-scan` `sleepTests`: a sleep or timer call with no fake timers in the file. | Runtime, and less flakiness. | Code that depends on real time, where the timer behaviour is itself under test. Never propose this when the test's subject is a timer. |
| **Shared read-only fixture.** Move expensive setup that tests never change from `beforeEach` to `beforeAll`. | General Fixture | Static candidate, confirmed by timing with `--claim time`. | Runtime. | Lost isolation (Beck's Test Desiderata). A test that changes the fixture makes the suite order-dependent. Verified with shuffle. |
| **Runner configuration (advice only).** vitest: `pool`, `isolate: false` for files safe without isolation, `--shard` in CI. jest: `--maxWorkers`. Follow each runner's performance guide. | Not a smell. A configuration cost. | Read the runner config. | Runtime. | Leaked state between files when isolation is off. |

Runner configuration is **advice only**. The skill never edits config files, never runs them through the verification protocol, and never lists them as approvable labels. It reports them under "Configuration advice" with the setting, the reason and the risk.

## 5. Rewrite verification protocol

A rewrite reaches the user only after every check passes. `test-verify-rewrite` runs checks 1 to 4 and 6; check 4's coverage part runs when `--coverage-command` is given. Check 5 (mutation) is run by the skill.

1. **Apply to the working tree, then restore.** The original is saved in memory, the rewrite is written, the checks run, and the original is restored in a `finally` block. The working tree is unchanged after the call. Git worktrees are not used because they lack `node_modules` (LRN-014).
2. **Tests pass, stably.** The affected file runs 3 times. Any failure, or a passed count that differs between runs, drops the rewrite.
3. **Order does not matter.** For shared-fixture and isolation rewrites, the file also runs with shuffled order: `--sequence.shuffle` (vitest) or `--randomize` (jest). `node:test` has no shuffle, so the check is skipped and the report says so.
4. **No check is lost.**
   - Passed cases after the rewrite are at least the number before. A parameterised test has one case per row, and each row maps to one original test.
   - Assertion calls after the rewrite are at least the number before (`test-verify-rewrite` counts them). A parameterised table (`--claim fold`) is exempt: one call runs once per row, so the held case count is the proof instead.
   - Every line and branch of the code under test that was covered before is still covered. `--coverage-command` runs coverage once on the original and once on the rewrite; the rewritten test file's own lines are left out. Skipped, and the report says so, when the repo has no coverage provider.
5. **Mutation score unchanged.** Only if Stryker is installed. The set of mutants killed before and after must match.
6. **The gain is real.** For rewrites that claim time saved (`--claim time`), the median duration before must exceed the after median by more than the spread between runs. Parameterised tests are claimed for lines saved, not time, and the report says so.

Merged rewrites: when several approved rewrites change one file, the merged copy is verified again before it is applied. A failed merge applies none of that file's rewrites.

Restore rule: if any check fails after the approved changes are applied (suite red, coverage lower), restore every file the skill changed, with `git checkout -- <file>` for modified and deleted files. This is only safe because the skill refuses to start on a dirty working tree.

## 6. Output shape

Deletions: `C1`, `C2`, … Group A ranked by runtime, each with its criterion, its evidence (which test subsumes it, and the signal: mutation, coverage or duplicate) and its duration. Group B follows in a separate clutter section, continuing the `C` numbering so each item can be approved, not ranked by time.

Rewrites: `R1`, `R2`, … Each with the smell, a short diff, the verification results (runs passed, cases and assertions before and after, mutation score if run) and the gain in lines or median time.

Configuration advice: a plain list, unlabelled, never applied.

Footer: total time saved by the approved items, and how many rewrites were dropped because they failed verification.

## 7. Limits

- Coverage subsumption is a weak signal. A file that is a coverage subset can still guard a fault the other file misses. The assertion judgment is the real check.
- Static analysis is heuristic. There is no parser dependency, so structure is read from the source text. The scan prefers reporting a candidate that the reader then rejects over hiding a real one; the skill reads every candidate's body before it is shown.
- The verification protocol checks that a rewrite keeps the same cases and assertion count. It does not check that the assertions test the same things. The reader makes that judgment.
- Fault detection is not measured. Nothing in this skill proves a deletion was safe.

## 8. References

- Yoo, S. & Harman, M. "Regression testing minimization, selection and prioritization: a survey." *STVR* 22(2), 2012.
- Rothermel, G. et al. "An empirical study of the effects of minimization on the fault detection capabilities of test suites." ICSM 1998.
- Shi, A., Gyori, A., Gligoric, M., Zaytsev, A., Marinov, D. "Balancing trade-offs in test-suite reduction." FSE 2014.
- Shi, A., Gyori, A., Mahmood, S., Zhao, P., Marinov, D. "Evaluating test-suite reduction in real software evolution." ISSTA 2018.
- Koochakzadeh, N. & Garousi, V. "A tester-assisted methodology for test redundancy detection." 2010.
- Chen, T. et al. "How do assertions impact coverage-based test-suite reduction?" 2017.
- Niedermayr, R., Juergens, E., Wagner, S. "Will my tests tell me if I break this code?" 2016. Vera-Pérez, O. et al. "A comprehensive study of pseudo-tested methods." *EMSE* 2019.
- Open Catalog of Test Smells: Empty Test, Ignored Test, Redundant Assertion, Duplicate Assert, Sleepy Test, General Fixture.
- Meszaros, G. *xUnit Test Patterns*. Addison-Wesley, 2007.
- Google, "Tests Too DRY? Make Them DAMP!" (Testing on the Toilet, 2019).
- Beck, K. Test Desiderata.
- Parsai, A., Murgia, A., Demeyer, S. "Mutation Testing as a Safety Net for Test Code Refactoring." 2015.
- StrykerJS documentation: `coverageAnalysis`, `disableBail`, mutation-testing-elements report schema.
