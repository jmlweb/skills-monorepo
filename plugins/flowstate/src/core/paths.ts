import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EntityType, TaskStatus } from "./types.js";
import { BacklogNotFoundError } from "./errors.js";

export function findBacklogRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".backlog"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new BacklogNotFoundError(start);
    }
    dir = parent;
  }
}

export function backlogRoot(root: string): string {
  return join(root, ".backlog");
}

export function taskDir(root: string, status: TaskStatus | "all"): string {
  if (status === "blocked") return taskDir(root, "active");
  if (status === "all") return join(backlogRoot(root), "tasks");
  return join(backlogRoot(root), "tasks", status);
}

export function ideaDir(
  root: string,
  status: "pending" | "complete",
): string {
  return join(backlogRoot(root), "ideas", status);
}

export function reportDir(
  root: string,
  status: "pending" | "complete",
): string {
  return join(backlogRoot(root), "reports", status);
}

export function learningsDir(root: string): string {
  return join(backlogRoot(root), "learnings");
}

export function taskIndexPath(root: string): string {
  return join(backlogRoot(root), "tasks", "index.md");
}

export function learningsIndexPath(root: string): string {
  return join(backlogRoot(root), "learnings", "index.md");
}

export const ENTITY_DIRS: Record<
  EntityType,
  readonly { readonly dir: string; readonly status: string }[]
> = {
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
