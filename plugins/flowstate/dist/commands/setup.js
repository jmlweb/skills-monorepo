import { existsSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir } from "../core/fs.js";
import { backlogRoot } from "../core/paths.js";
const TASK_INDEX_TEMPLATE = (name) => `# ${name} - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 0 |
| Active | 0 |
| Blocked | 0 |
| Complete | 0 |

## Active Tasks

_No active tasks._

## Pending Tasks

| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
`;
const LEARNINGS_INDEX_TEMPLATE = (name) => `# ${name} - Learnings Index

> Consult a learning's full document before starting related work.

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|
`;
export async function setup(root, projectName) {
    const backlogDir = backlogRoot(root);
    // Migration: rename plans/ -> ideas/
    const oldPlansDir = join(backlogDir, "plans");
    const newIdeasDir = join(backlogDir, "ideas");
    if (existsSync(oldPlansDir) && !existsSync(newIdeasDir)) {
        await rename(oldPlansDir, newIdeasDir);
    }
    const dirs = [
        join(backlogDir, "tasks", "pending"),
        join(backlogDir, "tasks", "active"),
        join(backlogDir, "tasks", "complete"),
        join(backlogDir, "ideas", "pending"),
        join(backlogDir, "ideas", "complete"),
        join(backlogDir, "reports", "pending"),
        join(backlogDir, "reports", "complete"),
        join(backlogDir, "learnings"),
    ];
    await Promise.all(dirs.map(ensureDir));
    // Git drops empty dirs; without a placeholder a fresh clone lacks tasks/active/ and
    // index-rebuild fails on the missing directory.
    await Promise.all(dirs.map((dir) => writeFile(join(dir, ".gitkeep"), "", { flag: "wx" }).catch((err) => {
        if (err.code !== "EEXIST")
            throw err;
    })));
    const taskIndexPath = join(backlogDir, "tasks", "index.md");
    const learningsIndexPath = join(backlogDir, "learnings", "index.md");
    await writeFile(taskIndexPath, TASK_INDEX_TEMPLATE(projectName), {
        flag: "wx",
    }).catch(() => {
        // File already exists — idempotent
    });
    await writeFile(learningsIndexPath, LEARNINGS_INDEX_TEMPLATE(projectName), {
        flag: "wx",
    }).catch(() => {
        // File already exists — idempotent
    });
    return backlogDir;
}
