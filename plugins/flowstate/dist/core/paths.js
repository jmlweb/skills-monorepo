import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { BacklogDirMissingError, BacklogNotFoundError, InvalidArgumentError, } from "./errors.js";
export const BACKLOG_DIR_ENV = "FLOWSTATE_BACKLOG_DIR";
// Nearest ancestor holding .git (dir or worktree file) or .backlog. Deliberately
// independent of CLAUDE_PROJECT_DIR, which Bash tool calls do not receive.
export function findProjectRoot(start) {
    let dir = start;
    for (;;) {
        if (existsSync(join(dir, ".git")) || existsSync(join(dir, ".backlog"))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir)
            return start;
        dir = parent;
    }
}
// FLOWSTATE_BACKLOG_DIR first (absolute; a relative value is resolved against the
// project root), then the nearest ancestor's .backlog. A configured directory that
// does not exist throws instead of silently yielding an empty backlog (LRN-001).
export function resolveBacklog(start, env = process.env) {
    const configured = env[BACKLOG_DIR_ENV];
    if (configured !== undefined && configured !== "") {
        const dir = resolve(findProjectRoot(start), configured);
        if (!existsSync(dir))
            throw new BacklogDirMissingError(dir);
        return { dir, source: "env" };
    }
    let dir = start;
    for (;;) {
        const candidate = join(dir, ".backlog");
        if (existsSync(candidate))
            return { dir: candidate, source: "walk-up" };
        const parent = dirname(dir);
        if (parent === dir)
            throw new BacklogNotFoundError(start);
        dir = parent;
    }
}
export function findBacklogRoot(start, env = process.env) {
    return resolveBacklog(start, env).dir;
}
export function taskDir(root, status) {
    if (status === "blocked")
        return taskDir(root, "active");
    if (status === "all")
        return join(root, "tasks");
    return join(root, "tasks", status);
}
export function ideaDir(root, status) {
    return join(root, "ideas", status);
}
export function reportDir(root, status) {
    return join(root, "reports", status);
}
export function learningsDir(root) {
    return join(root, "learnings");
}
export function taskIndexPath(root) {
    return join(root, "tasks", "index.md");
}
export function learningsIndexPath(root) {
    return join(root, "learnings", "index.md");
}
export const ENTITY_DIRS = {
    task: [
        { dir: "tasks/pending", status: "pending" },
        { dir: "tasks/active", status: "active" },
        { dir: "tasks/complete", status: "complete" },
    ],
    idea: [
        { dir: "ideas/pending", status: "pending" },
        { dir: "ideas/complete", status: "complete" },
    ],
    report: [
        { dir: "reports/pending", status: "pending" },
        { dir: "reports/complete", status: "complete" },
    ],
    learning: [{ dir: "learnings", status: "" }],
};
// Shared by all worktrees and never tracked, so a backlog here stays private.
export function privateBacklogDir(start) {
    let out;
    try {
        out = execFileSync("git", ["rev-parse", "--git-common-dir"], {
            cwd: start,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
    catch {
        throw new InvalidArgumentError("--private needs a repository checkout. Use --dir <path> instead.");
    }
    return join(resolve(start, out), "flowstate");
}
// Unlike resolveBacklog, the target may not exist yet: setup is what creates it.
export function resolveSetupTarget(start, input, env = process.env) {
    if (input.dir !== undefined && input.isPrivate === true) {
        throw new InvalidArgumentError("Use either --dir or --private, not both.");
    }
    if (input.dir !== undefined) {
        return { dir: resolve(findProjectRoot(start), input.dir), isCustom: true };
    }
    if (input.isPrivate === true) {
        return { dir: privateBacklogDir(start), isCustom: true };
    }
    const configured = env[BACKLOG_DIR_ENV];
    if (configured !== undefined && configured !== "") {
        return { dir: resolve(findProjectRoot(start), configured), isCustom: false };
    }
    return { dir: join(start, ".backlog"), isCustom: false };
}
export function settingsSnippet(dir) {
    return JSON.stringify({ env: { [BACKLOG_DIR_ENV]: dir } });
}
