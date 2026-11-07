# Worktree brief

Pasted by `parallel` into every subagent prompt. A worktree subagent sees only its prompt: it does not inherit the coordinator's rules or the backlog learnings, so worktree rules reach it only through this text.

1. **Mark the branch first.** Run `git commit --allow-empty -m "chore: start TSK-{{ID}}"` before any other command. The coordinator matches this worktree to the task through that subject, so a run interrupted before the first real commit stays traceable.
2. **Sync the base.** Run `git rebase {{BASE}}` (the branch holds only the empty marker, so nothing can conflict), then check that the project's README or AGENTS.md and the task's files exist. When they are missing, stop and report the base commit.
3. **Install dependencies** with the lockfile (for example `pnpm install --frozen-lockfile`). A fresh worktree has no `node_modules`, and commit hooks installed by a postinstall script may not run there.
4. **One plain command per Bash call**, run from the worktree root with literal paths. The isolation guard refuses commands it cannot prove stay inside the worktree: `cd` chains, `-C` redirects, variables, loops and pipes. Write files with Write or Edit instead of heredocs.
5. **Run the project's checks by hand** before committing (build, lint, tests), since commit hooks may be absent.
6. **When git is refused**, try the git binary by its full path (`/usr/bin/git`). If it is still refused, leave the commit to the coordinator and list the changed files in the report.
