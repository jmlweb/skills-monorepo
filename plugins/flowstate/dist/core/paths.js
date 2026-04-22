import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { BacklogNotFoundError } from "./errors.js";
export function findBacklogRoot(start) {
    let dir = start;
    for (;;) {
        if (existsSync(join(dir, ".backlog")))
            return dir;
        const parent = dirname(dir);
        if (parent === dir) {
            throw new BacklogNotFoundError(start);
        }
        dir = parent;
    }
}
export function backlogRoot(cwd) {
    return join(cwd, ".backlog");
}
export function taskDir(cwd, status) {
    if (status === "blocked")
        return taskDir(cwd, "active");
    if (status === "all")
        return join(backlogRoot(cwd), "tasks");
    return join(backlogRoot(cwd), "tasks", status);
}
export function ideaDir(cwd, status) {
    return join(backlogRoot(cwd), "ideas", status);
}
export function reportDir(cwd, status) {
    return join(backlogRoot(cwd), "reports", status);
}
export function learningsDir(cwd) {
    return join(backlogRoot(cwd), "learnings");
}
export function taskIndexPath(cwd) {
    return join(backlogRoot(cwd), "tasks", "index.md");
}
export function learningsIndexPath(cwd) {
    return join(backlogRoot(cwd), "learnings", "index.md");
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
