import { taskDir, ideaDir, reportDir, learningsDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";
import { BUCKETS, taskStatusOf } from "../core/store.js";
import type { TaskStatus } from "../core/types.js";
import { join } from "node:path";
import { readdir } from "node:fs/promises";

export interface BacklogStats {
  readonly pending: number;
  readonly active: number;
  readonly blocked: number;
  readonly complete: number;
  readonly pendingIdeas: number;
  readonly pendingReports: number;
  readonly learnings: number;
}

export async function stats(root: string): Promise<BacklogStats> {
  const counts: Record<TaskStatus, number> = { pending: 0, active: 0, blocked: 0, complete: 0 };

  const [taskStatuses, pendingIdeas, pendingReports, learnings] = await Promise.all([
    Promise.all(
      BUCKETS.task.map(async (bucket) => {
        const dir = taskDir(root, bucket);
        const files = (await listFiles(dir)).filter((f) => f.name !== "index.md");
        return Promise.all(
          files.map(async (file) => {
            const doc = await readEntity(join(dir, file.name));
            return taskStatusOf(bucket, doc.frontmatter as Record<string, unknown>);
          }),
        );
      }),
    ),
    listFiles(ideaDir(root, "pending")).then((f) => f.length),
    listFiles(reportDir(root, "pending")).then((f) => f.length),
    readdir(learningsDir(root)).then((e) => e.filter((n) => n.startsWith("LRN-")).length).catch(() => 0),
  ]);

  for (const status of taskStatuses.flat()) counts[status] += 1;

  return { ...counts, pendingIdeas, pendingReports, learnings };
}
