import { existsSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir } from "../core/fs.js";
import { backlogRoot } from "../core/paths.js";

const TASK_INDEX_TEMPLATE = (name: string) => `# ${name} - Task Index

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

const LEARNINGS_INDEX_TEMPLATE = (name: string) => `# ${name} - Learnings Index

> Consult a learning's full document before starting related work.

| ID | Title | Tags | Status | Date |
|----|-------|------|--------|------|
`;

export async function setup(cwd: string, projectName: string): Promise<string> {
  const root = backlogRoot(cwd);

  // Migration: rename plans/ -> ideas/
  const oldPlansDir = join(root, "plans");
  const newIdeasDir = join(root, "ideas");
  if (existsSync(oldPlansDir) && !existsSync(newIdeasDir)) {
    await rename(oldPlansDir, newIdeasDir);
  }

  const dirs = [
    join(root, "tasks", "pending"),
    join(root, "tasks", "active"),
    join(root, "tasks", "complete"),
    join(root, "ideas", "pending"),
    join(root, "ideas", "complete"),
    join(root, "reports", "pending"),
    join(root, "reports", "complete"),
    join(root, "learnings"),
  ];

  await Promise.all(dirs.map(ensureDir));

  const taskIndexPath = join(root, "tasks", "index.md");
  const learningsIndexPath = join(root, "learnings", "index.md");

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

  return root;
}
