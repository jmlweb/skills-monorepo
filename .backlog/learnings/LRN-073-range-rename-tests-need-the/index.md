---
id: LRN-073
title: Range rename tests need the source file on the base, or git reports A and the test passes vacuously
status: active
tags: [dev-workflow, git, scan-secrets, testing]
task: TSK-095
created: 2026-11-28
---

In `git diff main...HEAD`, a file created and then renamed inside the branch shows as `A`, not `R`, because the diff compares against the merge base. A rename/copy test over a range must first move the base past the commit that creates the source file (`git branch -f main HEAD`), or it passes even with `--diff-filter=AM`.

Copies show as `C` only when copy detection is on (`diff.renames=copies` or `-C`); by default a copy is reported as `A`. Tests for the `C` status must set that config.
