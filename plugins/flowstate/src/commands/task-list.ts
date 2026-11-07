import type { TaskStatus } from "../core/types.js";
import type { BacklogStore, TaskBucket } from "../core/store.js";
import { BLOCKABLE_BUCKETS, BUCKETS, taskStatusOf } from "../core/store.js";

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
  store: BacklogStore,
  status?: TaskStatus,
  limit?: number,
): Promise<TaskListItem[]> {
  // pending/active/complete name a bucket, so a blocked task still lists under the bucket
  // it sits in (LRN-040); only "blocked" filters on the derived status.
  const buckets: readonly TaskBucket[] = !status
    ? BUCKETS.task
    : status === "blocked"
      ? BLOCKABLE_BUCKETS
      : [status];

  const items: TaskListItem[] = [];

  for (const task of await store.list("task", buckets)) {
    const fm = task.frontmatter;

    if (status === "blocked" && taskStatusOf(task.bucket, fm) !== "blocked") continue;

    items.push({
      id: String(fm["id"] ?? ""),
      title: String(fm["title"] ?? ""),
      status: String(fm["status"] ?? task.bucket),
      priority: String(fm["priority"] ?? ""),
      tags: Array.isArray(fm["tags"]) ? fm["tags"] as string[] : [],
      created: String(fm["created"] ?? ""),
      started: fm["started"] ? String(fm["started"]) : undefined,
      completed: fm["completed"] ? String(fm["completed"]) : undefined,
      blockedBy: fm["blocked-by"] ? String(fm["blocked-by"]) : undefined,
      path: task.path,
    });
  }

  items.sort((a, b) => a.priority.localeCompare(b.priority));
  return limit ? items.slice(0, limit) : items;
}
