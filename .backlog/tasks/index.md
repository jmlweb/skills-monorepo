# Project - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 8 |
| Active | 0 |
| Blocked | 1 |
| Complete | 85 |

## Active Tasks

- TSK-023: atlassian-polish: verify md-to-adf with a real Jira write (P2) [BLOCKED: No Jira access in this environment; real CF-620 write cannot be run here. Resume where Atlassian access exists.]

## Pending Tasks

| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|
| TSK-087 | Fix: md-to-adf accepts a --jira-base without a scheme and writes broken smart links | P4 | atlassian-polish, md-to-adf, validation | 2026-11-13 |
| TSK-088 | Fix: md-to-adf turns a Markdown image into literal text plus a link instead of exiting 2 | P4 | atlassian-polish, md-to-adf | 2026-11-13 |
| TSK-089 | Fix: task-update --set tags= or depends-on= writes a scalar that every reader drops | P3 | flowstate, cli, validation | 2026-11-16 |
| TSK-090 | Fix: task-update --set accepts malformed keys that bypass the status and priority guards | P3 | flowstate, cli, validation | 2026-11-19 |
| TSK-091 | Fix: task-create stores non-ID depends-on values and empty tags | P4 | flowstate, cli, validation | 2026-11-19 |
| TSK-092 | Fix: task-unblock rewrites a complete task to status active inside tasks/complete | P3 |  | 2026-11-22 |
| TSK-093 | Fix: backlog:check rejects a blocked task in tasks/pending, which task-block writes by design | P3 |  | 2026-11-22 |
| TSK-094 | Fix: task-move --to pending writes status pending on a blocked task that keeps blocked-by | P4 |  | 2026-11-22 |

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
| TSK-086 | Fix: scan-secrets misses fine-grained GitHub tokens (github_pat_) | 2026-11-22 |
| TSK-085 | Fix: flowstate CLI rejects unknown flags that carry a value | 2026-11-19 |
| TSK-084 | Fix: md-to-adf fence recognition (tilde fences, info strings, longer fences) | 2026-11-16 |
| TSK-083 | Fix: Flag values with a newline inject extra frontmatter keys (--task-id, --reason, --tags) | 2026-11-13 |
| TSK-082 | Fix: read-only-zones hook matches paths inside a nested git repo or submodule against the wrong root | 2026-11-10 |
| TSK-053 | Fix: review-idea and triage-report number their decision menus after a numbered list | 2026-11-07 |
| TSK-057 | Optional GitHub Issues backend for tasks, ideas and reports | 2026-11-07 |
| TSK-060 | Fix: A pipe or newline in an entity title corrupts frontmatter and index tables | 2026-11-07 |
| TSK-061 | Fix: task-create --criteria accepts non-string-array JSON and crashes or writes object Object | 2026-11-07 |
| TSK-062 | Fix: CLI arg parsers store true for flag values that are empty or start with -- | 2026-11-07 |
