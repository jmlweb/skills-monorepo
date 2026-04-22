import { join } from "node:path";
import type { TaskStatus } from "../core/types.js";
import { taskDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";

export interface TaskListItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority: string;
  readonly tags: readonly string[];
  readonly created: string;
  readonly started: string | undefined;
  readonly completed: string | undefined;
  readonly blockedBy: string | undefined;
  readonly path: string;
}

export async function taskList(
  cwd: string,
  status?: TaskStatus,
  limit?: number,
): Promise<TaskListItem[]> {
  const statuses: TaskStatus[] = status
    ? [status]
    : ["pending", "active", "complete"];

  const items: TaskListItem[] = [];

  for (const s of statuses) {
    const dir = taskDir(cwd, s);
    const files = await listFiles(dir);

    for (const file of files) {
      if (file.name === "index.md") continue;
      const filePath = join(dir, file.name);
      const doc = await readEntity(filePath);
      const fm = doc.frontmatter as Record<string, unknown>;

      const item: TaskListItem = {
        id: String(fm["id"] ?? ""),
        title: String(fm["title"] ?? ""),
        status: String(fm["status"] ?? s),
        priority: String(fm["priority"] ?? ""),
        tags: Array.isArray(fm["tags"]) ? fm["tags"] as string[] : [],
        created: String(fm["created"] ?? ""),
        started: fm["started"] ? String(fm["started"]) : undefined,
        completed: fm["completed"] ? String(fm["completed"]) : undefined,
        blockedBy: fm["blocked-by"] ? String(fm["blocked-by"]) : undefined,
        path: filePath,
      };

      // Filter blocked tasks when status=blocked
      if (status === "blocked" && !fm["blocked-by"]) continue;

      items.push(item);
    }
  }

  items.sort((a, b) => a.priority.localeCompare(b.priority));
  return limit ? items.slice(0, limit) : items;
}
