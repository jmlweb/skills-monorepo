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
export function backlogRoot(root) {
    return join(root, ".backlog");
}
export function taskDir(root, status) {
    if (status === "blocked")
        return taskDir(root, "active");
    if (status === "all")
        return join(backlogRoot(root), "tasks");
    return join(backlogRoot(root), "tasks", status);
}
export function ideaDir(root, status) {
    return join(backlogRoot(root), "ideas", status);
}
export function reportDir(root, status) {
    return join(backlogRoot(root), "reports", status);
}
export function learningsDir(root) {
    return join(backlogRoot(root), "learnings");
}
export function taskIndexPath(root) {
    return join(backlogRoot(root), "tasks", "index.md");
}
export function learningsIndexPath(root) {
    return join(backlogRoot(root), "learnings", "index.md");
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
