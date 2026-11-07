import { join } from "node:path";
import type { TaskStatus } from "../core/types.js";
import type { TaskBucket } from "../core/store.js";
import { BUCKETS, taskStatusOf } from "../core/store.js";
import { listFiles, readEntity, writeEntity } from "../core/fs.js";

export interface TaskDoctorFix {
  readonly id: string;
  readonly path: string;
  readonly folder: TaskBucket;
  readonly statusBefore: string;
  readonly statusAfter: TaskStatus;
}

export interface TaskDoctorResult {
  readonly scanned: number;
  readonly fixed: readonly TaskDoctorFix[];
}

// The folder plus `blocked-by` decide the status (taskStatusOf); the frontmatter never
// does. So a synonym like "done" in complete/ becomes "complete", a "completed" in
// pending/ falls back to "pending", and a blocked task keeps "blocked" in pending/ or active/.
export async function taskDoctor(
  root: string,
  options: { readonly dryRun?: boolean } = {},
): Promise<TaskDoctorResult> {
  const dryRun = options.dryRun === true;
  const fixes: TaskDoctorFix[] = [];
  let scanned = 0;

  for (const folder of BUCKETS.task) {
    const dir = join(root, "tasks", folder);
    let files;
    try {
      files = await listFiles(dir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (file.name === "index.md") continue;
      const filePath = join(dir, file.name);
      const doc = await readEntity(filePath);
      const fm = { ...(doc.frontmatter as Record<string, unknown>) };
      const id = String(fm["id"] ?? "");
      if (!id) continue;
      scanned += 1;

      const rawStatus = String(fm["status"] ?? "").toLowerCase().trim();
      const target = taskStatusOf(folder, fm);
      if (rawStatus === target) continue;

      fixes.push({
        id,
        path: filePath,
        folder,
        statusBefore: String(fm["status"] ?? ""),
        statusAfter: target,
      });

      if (!dryRun) {
        fm["status"] = target;
        await writeEntity(filePath, fm, doc.body);
      }
    }
  }

  return { scanned, fixed: fixes };
}
