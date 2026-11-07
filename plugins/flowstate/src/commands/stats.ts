import { learningsDir } from "../core/paths.js";
import { listLearningFiles } from "../core/fs.js";
import type { BacklogStore } from "../core/store.js";
import { BUCKETS, taskStatusOf } from "../core/store.js";
import type { TaskStatus } from "../core/types.js";

export interface BacklogStats {
  readonly pending: number;
  readonly active: number;
  readonly blocked: number;
  readonly complete: number;
  readonly pendingIdeas: number;
  readonly pendingReports: number;
  readonly learnings: number;
}

// Tasks, ideas and reports come through the store (files or GitHub Issues); learnings
// are counted from the backlog directory in every mode.
export async function stats(store: BacklogStore, root: string): Promise<BacklogStats> {
  const counts: Record<TaskStatus, number> = { pending: 0, active: 0, blocked: 0, complete: 0 };

  const [tasks, pendingIdeas, pendingReports, learnings] = await Promise.all([
    store.list("task", BUCKETS.task),
    store.list("idea", ["pending"]).then((items) => items.length),
    store.list("report", ["pending"]).then((items) => items.length),
    listLearningFiles(learningsDir(root)).then((names) => names.length),
  ]);

  for (const task of tasks) counts[taskStatusOf(task.bucket, task.frontmatter)] += 1;

  return { ...counts, pendingIdeas, pendingReports, learnings };
}
