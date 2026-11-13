# Project - Learnings Index

> Consult a learning's full document before starting related work.

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|
| LRN-001 | Silent error handling in listFiles() masks path resolution bugs | testing, error-handling, regressions | active | 2026-04-10 |
| LRN-002 | Keep add-task naming despite TaskCreate reminder collision | flowstate, naming, skill-design, decisions | active | 2026-04-27 |
| LRN-003 | Plugin skills can't be Agent subagent_type | skill-invocation, agent-tool, plugin-skills, plugin-agents, footgun | active | 2026-04-30 |
| LRN-004 | Parallel worktree agents start from a stale base and lack git hooks | worktree, parallel, tooling, git | archived | 2026-10-08 |
| LRN-005 | Settings env delivery to Bash/hooks unverified; CLAUDE_PROJECT_DIR absent in Bash | claude-code, settings, env, hooks, flowstate | archived | 2026-10-08 |
| LRN-006 | Jira Markdown reads drop panels; a saved REST response is not a bare ADF doc | atlassian-polish, adf, jira, lossy-content | active | 2026-10-08 |
| LRN-007 | Verified: settings env reaches Bash and hooks; CLAUDE_PROJECT_DIR is hook-only | claude-code, settings, env, hooks, flowstate | active | 2026-10-08 |
| LRN-008 | Worktree agents must call /usr/bin/git; RTK rewrite trips the isolation guard | worktree, parallel, rtk, git, tooling | archived | 2026-10-08 |
| LRN-009 | Root plugin validate only checks marketplace; validate the plugin dir for agents/skills | claude-code, plugin-validation, agents | active | 2026-10-08 |
| LRN-010 | Worktree agents: use /usr/bin/git, pnpm install first, hooks don't run | worktree, git, rtk, pnpm, tooling | archived | 2026-10-08 |
| LRN-011 | claude plugin eval cases are prompt.md plus graders, not case.yaml | evals, claude-code, routing | active | 2026-10-08 |
| LRN-012 | Top-3 routing test fixtures need more than 3 skills | testing, routing, tf-idf | active | 2026-10-08 |
| LRN-013 | Worktree agents cannot run git through the rtk hook | tooling, worktree, rtk, git | archived | 2026-10-08 |
| LRN-014 | Fresh worktrees lack node_modules | tooling, worktree, testing | archived | 2026-10-08 |
| LRN-015 | Test not-on-main by checking out the tagged commit | testing, release, node-test | active | 2026-10-08 |
| LRN-016 | CLI --help goes to stderr for dev-workflow and atlassian-polish, stdout for flowstate | cli, testing, skill-lint | active | 2026-10-08 |
| LRN-017 | Worktree agents' git calls are refused when the guard cannot prove the command is not git | worktree, rtk, git, tooling | archived | 2026-10-08 |
| LRN-018 | Flipping skills to user-invoked shifts the routing rank-1 ratchet | routing, testing, skills, invocation | active | 2026-10-08 |
| LRN-019 | Worktree subagents: rtk-safe git, install first, sync the base, plain commands | worktree, parallel, tooling, rtk, git, pnpm | active | 2026-10-08 |
| LRN-020 | task-create leaves index.md one trailing line short of index-rebuild output | flowstate, index, ci, testing | active | 2026-10-08 |
| LRN-021 | Worktree guard rejects compound or variable-driven Bash commands | worktree, tooling, parallel | archived | 2026-10-08 |
| LRN-022 | tsc never deletes dist outputs whose source vanished, and turbo cache restores them | dist, build, turbo, ci | active | 2026-10-09 |
| LRN-023 | pnpm bump only works inside the plugin dir | release, pnpm, tooling | active | 2026-10-09 |
| LRN-024 | Agent worktrees can branch from a stale commit missing tooling | worktree, tooling, lint-skills, parallel | archived | 2026-10-09 |
| LRN-025 | Worktree guard rejects rtk-rewritten git; use /usr/bin/git | worktree, git, rtk | archived | 2026-10-09 |
| LRN-026 | Routing eval breaks when description rewrites drop legacy trigger words | routing, descriptions, evals, skills | active | 2026-10-09 |
| LRN-027 | lint:skills counts body lines excluding frontmatter | lint-skills, skills, writing-rules | active | 2026-10-09 |
| LRN-028 | Re-merge a stale skill audit by taking main's files and replaying edits | workflow, skills, merge, worktree | active | 2026-10-09 |
| LRN-029 | Piping pnpm bump to head can abort the bump via SIGPIPE | pnpm, bump, tooling | active | 2026-10-09 |
| LRN-030 | Section helpers in markdown.ts are not fence-aware | flowstate, markdown, cli | active | 2026-10-09 |
| LRN-031 | Attach stdin heredocs to the node command so Bash(node:*) covers them; avoid ! preprocessing for flowstate path | skills, allowed-tools, claude-code, permissions | active | 2026-10-14 |
| LRN-032 | Node 24 default test reporter prints 'ℹ pass N', not TAP's '# pass N' | testing, node-test, parsing | active | 2026-10-15 |
| LRN-033 | Static assertion-call count rejects valid table folds | testing, refactoring, verification | active | 2026-10-15 |
| LRN-034 | Plugin skills in a session load from the plugin cache, not from plugins/ | claude-code, plugins, testing | active | 2026-10-15 |
| LRN-035 | Any CLI spawn with the real env writes to the shared registry | flowstate, testing, registry | active | 2026-10-16 |
| LRN-036 | Registry identity needs realpath: macOS temp dirs alias /var and /private/var | flowstate, macos, paths | active | 2026-10-16 |
| LRN-037 | String.replace treats $-patterns in a string replacement as commands | scripts, patching, javascript, flowstate, skills | active | 2026-10-17 |
| LRN-038 | The Bash tool runs zsh: no word-splitting, nomatch globs abort, a leading = is a command lookup | shell, zsh, tooling, skills, flowstate | active | 2026-10-18 |
| LRN-039 | A bumped version pushed to main ships to users; the tag only cuts the GitHub Release | release, marketplace, claude-code, versioning | active | 2026-10-18 |
| LRN-040 | A blocked task can sit in tasks/pending, so status does not say where a task lives | flowstate, store, tasks | active | 2026-10-22 |
| LRN-041 | task-block leaves tasks/index.md stale, which fails pnpm backlog:check in CI | flowstate, backlog, ci | active | 2026-10-22 |
| LRN-042 | Stray package.json or lockfile in a parent dir breaks the suite; turbo drops TMPDIR | testing, tooling, turbo, vitest | active | 2026-10-20 |
| LRN-043 | readme-media acceptance run needs a human session plus vhs, ttyd, ffmpeg and claude | sandbox, skills, readme-media, testing | active | 2026-10-20 |
| LRN-044 | Lint double-quoted skill placeholders per section, skipping fences and heredocs | lint-skills, skills, shell | active | 2026-10-24 |
| LRN-045 | parallel SKILL.md body sits at the 150-line lint ceiling | skills, lint, flowstate | active | 2026-10-26 |
| LRN-046 | Check a Mermaid block renders locally with mmdc and system Chrome | mermaid, dev-workflow, pr-writer, testing | active | 2026-10-28 |
| LRN-047 | Package-manager detection must walk ancestors once, not per lockfile | dev-workflow, testing, tooling | active | 2026-11-01 |
| LRN-048 | Pin git diff output before parsing it: user config rewrites headers and paths | dev-workflow, git, scan-secrets | active | 2026-11-05 |
| LRN-049 | Any Agent spawn without a model inherits the caller model, so pin one on every spawn | agents, tokens, model, caveman, delegation | active | 2026-11-07 |
| LRN-050 | Worktree guard rejects printf -- pipelines, not only git | worktree, tooling, shell, isolation-guard | active | 2026-11-07 |
| LRN-051 | A wider table row cannot be told apart from an unescaped pipe, so md-to-adf refuses it | atlassian-polish, md-to-adf, tables, design | active | 2026-11-07 |
| LRN-052 | A conditional template block needs a negative fixture check in the sandbox | kickstart, sandbox, templates, testing | active | 2026-11-07 |
| LRN-053 | PostToolUse never sees a failed Bash call; key PostToolUseFailure on the Exit code N line of error | flowstate, hooks, claude-code | active | 2026-11-07 |
| LRN-054 | Worktree isolation guard inspects command text: any payload mentioning git is refused | tooling, worktree, agents, isolation-guard | active | 2026-11-07 |
| LRN-055 | Matching a worktree branch to a task through BASE..branch needs a merged-branch fallback | flowstate, parallel, git, resume | active | 2026-11-07 |
| LRN-056 | A marker commit breaks merge --ff-only base sync; worktree briefs rebase instead | worktree, parallel, git, flowstate | active | 2026-11-07 |
| LRN-057 | Agent tools entries for an absent MCP server are dropped silently when any other tool resolves | claude-code, plugin-agents, mcp, tools | active | 2026-11-07 |
| LRN-058 | Routing eval negative cases with a built-in owner need external: true and prompts free of description tokens | routing, evals, skills, tf-idf | active | 2026-11-07 |
| LRN-059 | A JS scanner decides division vs regex from the previous token; bail a regex scan at a newline | dev-workflow, test-static-scan, parser, javascript | active | 2026-11-07 |
| LRN-060 | Probe a plugin hook end to end with a nested claude -p --plugin-dir in a scratch repo | claude-code, hooks, testing, plugins | active | 2026-11-07 |
| LRN-061 | Declare the few switch flags that may appear bare; every other flag must carry a value | cli, args, flowstate, dev-workflow, atlassian-polish | active | 2026-11-07 |
| LRN-062 | Compare CLI-printed paths by suffix in integration tests: the CLI prints realpath | flowstate, testing, macos, paths | active | 2026-11-07 |
| LRN-063 | A server-assigned ID backend keeps the ID out of the stored payload and derives it on read | flowstate, store, github, design | active | 2026-11-07 |
| LRN-064 | A stub for an external CLI must mirror its global preconditions, not only the happy subcommands | testing, gh, hooks, stubs | active | 2026-11-07 |
| LRN-065 | Wait for CI on main before pushing a release tag; CLI-spawning suites need an explicit vitest timeout | release, ci, testing, vitest, flowstate | active | 2026-11-07 |
| LRN-066 | A submodule .git file also points inside the parent .git: check .git/worktrees/, not .git/ | dev-workflow, hooks, read-only-zones, git | active | 2026-11-10 |
| LRN-067 | Task IDs can exceed three digits in GitHub mode; validate with TSK-\d{3,}, not parseId | flowstate, cli, validation, github | active | 2026-11-13 |
| LRN-068 | serializeFrontmatter is the single choke point for injected frontmatter keys | flowstate, frontmatter, validation | active | 2026-11-13 |
