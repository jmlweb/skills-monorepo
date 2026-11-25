---
id: RPT-041
title: mutation-subsets drops tests named only in killedBy/coveredBy and exits 0 as clean
type: bug
severity: low
status: triaged
created: 2026-11-25
triaged: 2026-11-25
task-id: TSK-096
---

## Where

`plugins/code-hygiene/src/commands/mutation-subsets.ts:56` builds the list of tests to compare only from `testFiles[*].tests` (`names`, filled at `:42`). The `kills` and `covers` maps are built from every id in `killedBy`/`coveredBy`, but a test id that is missing from `testFiles` is never compared. In the mutation-testing-report schema, `testFiles` is optional.

## Reproduction

The report below has two killed mutants, with `killedBy` `["t1","t2"]` and `["t1"]`, and no `testFiles`:

```bash
node plugins/code-hygiene/dist/bin/code-hygiene.js mutation-subsets --report r.json --json true; echo "exit $?"
```

Observed:

```
{ "mutants": 2, "tests": 0, "bailSuspected": false, "zeroKill": [], "subsets": [] }
exit 0
```

If `testFiles` with `t1`/`t2` is added to the same report, the command prints `two	kills 1	subsumed by one` and exits 1.

## Expected

Every test id in `killedBy`/`coveredBy` is compared, with its name taken from `testFiles` when it is there (the `label` fallback at `:57` already handles a missing name). Or, when a report has killed mutants but no known tests, the command fails loudly instead of exiting 0. Right now an incomplete report reads as "nothing redundant", which goes against the repo rule that empty must stay distinct from "lookup failed" (LRN-001).
