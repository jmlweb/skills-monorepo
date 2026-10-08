# Project - Learnings Index

> Consult a learning's full document before starting related work.

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|
| LRN-001 | Silent error handling in listFiles() masks path resolution bugs | testing, error-handling, regressions | active | 2026-04-10 |
| LRN-002 | Keep add-task naming despite TaskCreate reminder collision | flowstate, naming, skill-design, decisions | active | 2026-04-27 |
| LRN-003 | Plugin skills can't be Agent subagent_type | skill-invocation, agent-tool, plugin-skills, plugin-agents, footgun | active | 2026-04-30 |
| LRN-004 | Parallel worktree agents start from a stale base and lack git hooks | worktree, parallel, tooling, git | active | 2026-10-08 |
| LRN-005 | Settings env delivery to Bash/hooks unverified; CLAUDE_PROJECT_DIR absent in Bash | claude-code, settings, env, hooks, flowstate | archived | 2026-10-08 |
| LRN-006 | Jira Markdown reads drop panels; a saved REST response is not a bare ADF doc | atlassian-polish, adf, jira, lossy-content | active | 2026-10-08 |
| LRN-007 | Verified: settings env reaches Bash and hooks; CLAUDE_PROJECT_DIR is hook-only | claude-code, settings, env, hooks, flowstate | active | 2026-10-08 |
| LRN-008 | Worktree agents must call /usr/bin/git; RTK rewrite trips the isolation guard | worktree, parallel, rtk, git, tooling | active | 2026-10-08 |
| LRN-009 | Root plugin validate only checks marketplace; validate the plugin dir for agents/skills | claude-code, plugin-validation, agents | active | 2026-10-08 |
| LRN-010 | Worktree agents: use /usr/bin/git, pnpm install first, hooks don't run | worktree, git, rtk, pnpm, tooling | active | 2026-10-08 |
| LRN-011 | claude plugin eval cases are prompt.md plus graders, not case.yaml | evals, claude-code, routing | active | 2026-10-08 |
| LRN-012 | Top-3 routing test fixtures need more than 3 skills | testing, routing, tf-idf | active | 2026-10-08 |
| LRN-013 | Worktree agents cannot run git through the rtk hook | tooling, worktree, rtk, git | active | 2026-10-08 |
| LRN-014 | Fresh worktrees lack node_modules | tooling, worktree, testing | active | 2026-10-08 |
| LRN-015 | Test not-on-main by checking out the tagged commit | testing, release, node-test | active | 2026-10-08 |
| LRN-016 | CLI --help goes to stderr for dev-workflow and atlassian-polish, stdout for flowstate | cli, testing, skill-lint | active | 2026-10-08 |
| LRN-017 | Worktree agents' git calls are refused when the guard cannot prove the command is not git | worktree, rtk, git, tooling | active | 2026-10-08 |
| LRN-018 | Flipping skills to user-invoked shifts the routing rank-1 ratchet | routing, testing, skills, invocation | active | 2026-10-08 |
| LRN-019 | Worktree agents need /usr/bin/git, an install, and may start from a stale base | worktree, parallel, tooling, rtk | active | 2026-10-08 |
