# Project - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 15 |
| Active | 1 |
| Blocked | 2 |
| Complete | 56 |

## Active Tasks

- TSK-023: atlassian-polish: verify md-to-adf with a real Jira write (P2) [BLOCKED: No Jira access in this environment; real CF-620 write cannot be run here. Resume where Atlassian access exists.]
- TSK-053: Fix: review-idea and triage-report number their decision menus after a numbered list (P3)
- TSK-057: Optional GitHub Issues backend for tasks, ideas and reports (P2) [BLOCKED: Phase 1 (criteria 1, 2, 4) landed on hustle/maintainer/task-2026-10-22. Phase 2 remains: criteria 3, 5-11 need the gh wrapper, GithubStore, resolveStore backend selection, setup --github, GitHub-mode compress/condense/stats/doctor/hook, stub-gh contract tests and docs. Too large for one unattended run; split Phase 2 into its own task.]

## Pending Tasks

| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|
| TSK-060 | Fix: A pipe or newline in an entity title corrupts frontmatter and index tables | P3 | flowstate, cli, index | 2026-10-22 |
| TSK-061 | Fix: task-create --criteria accepts non-string-array JSON and crashes or writes object Object | P4 | flowstate, cli | 2026-10-22 |
| TSK-062 | Fix: CLI arg parsers store true for flag values that are empty or start with -- | P3 |  | 2026-10-24 |
| TSK-063 | Fix: report-move and idea-move accept any --status value | P3 |  | 2026-10-26 |
| TSK-064 | Fix: task-update --set writes unvalidated values, including id and priority | P3 |  | 2026-10-26 |
| TSK-065 | Fix: list commands accept a negative or non-numeric --limit | P4 |  | 2026-10-26 |
| TSK-066 | Fix: md-to-adf silently drops table cells beyond the header width | P3 |  | 2026-10-28 |
| TSK-067 | Fix: md-to-adf turns a fenced code block inside a list item into inline text | P3 |  | 2026-10-28 |
| TSK-068 | Fix: md-to-adf truncates link URLs that contain parentheses | P4 |  | 2026-10-28 |
| TSK-069 | Fix: scan-secrets skips every file when git diff paths lack the b/ prefix | P2 |  | 2026-11-01 |
| TSK-070 | Fix: on-test-failure hook never fires: wrong event and nonexistent exit_code field | P3 |  | 2026-11-01 |
| TSK-071 | Fix: pre-commit-reminder hook emits invalid JSON when an active task title holds a double quote | P4 |  | 2026-11-01 |
| TSK-072 | Fix: test-static-scan drops a test whose body holds a quote inside a regex literal | P3 |  | 2026-11-05 |
| TSK-073 | Fix: task-doctor resets a blocked task in tasks/pending to pending and the block disappears | P3 |  | 2026-11-05 |
| TSK-074 | Fix: task-doctor plain output prints [object Object] for each fixed task | P4 |  | 2026-11-05 |

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
| TSK-059 | Fix: detect-test-runner picks a farther lockfile over the nearest one and never detects npm | 2026-11-01 |
| TSK-058 | dev-workflow: Mermaid diagram in descriptions of complex PRs | 2026-10-28 |
| TSK-055 | Fix: parallel skill leaves worktrees behind after merge | 2026-10-26 |
| TSK-054 | Fix: Skills put user text in double-quoted CLI args without a phrasing rule | 2026-10-24 |
| TSK-056 | dev-workflow: readme-media skill generates README screenshots and GIFs | 2026-10-23 |
| TSK-052 | flowstate kickstart skill: description to evaluated, documented, tasked project | 2026-10-19 |
| TSK-051 | flowstate: shared learnings across projects, on by default | 2026-10-16 |
| TSK-035 | Audit atlassian-polish skills against writing rules | 2026-10-15 |
| TSK-049 | Triage all pending reports sequentially when triage-report gets no argument | 2026-10-15 |
| TSK-050 | dev-workflow prune-tests skill for redundant tests | 2026-10-15 |
