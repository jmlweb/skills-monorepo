import { join } from "node:path";
import type { TaskStatus } from "../core/types.js";
import { backlogRoot } from "../core/paths.js";
import { listFiles, readEntity, writeEntity } from "../core/fs.js";

export interface TaskDoctorFix {
  readonly id: string;
  readonly path: string;
  readonly folder: TaskStatus;
  readonly statusBefore: string;
  readonly statusAfter: TaskStatus;
}

export interface TaskDoctorResult {
  readonly scanned: number;
  readonly fixed: readonly TaskDoctorFix[];
}

// Folders that hold task files. Note: "blocked" is not a folder — blocked
// tasks live in active/ with a `blocked-by` field.
const FOLDERS: readonly TaskStatus[] = ["pending", "active", "complete"];

// Map common synonyms / drift values to canonical TaskStatus. Values not in
// this map fall back to the folder-derived canonical status.
const SYNONYMS: Record<string, TaskStatus> = {
  // complete
  complete: "complete",
  completed: "complete",
  done: "complete",
  finished: "complete",
  closed: "complete",
  resolved: "complete",
  // active
  active: "active",
  "in-progress": "active",
  in_progress: "active",
  inprogress: "active",
  wip: "active",
  started: "active",
  doing: "active",
  // pending
  pending: "pending",
  todo: "pending",
  backlog: "pending",
  open: "pending",
  new: "pending",
  // blocked
  blocked: "blocked",
  stuck: "blocked",
  waiting: "blocked",
};

export async function taskDoctor(
  cwd: string,
  options: { readonly dryRun?: boolean } = {},
): Promise<TaskDoctorResult> {
  const dryRun = options.dryRun === true;
  const root = backlogRoot(cwd);
  const fixes: TaskDoctorFix[] = [];
  let scanned = 0;

  for (const folder of FOLDERS) {
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
      const blockedBy = fm["blocked-by"];
      const isBlocked = folder === "active" && Boolean(blockedBy);
      const canonical: TaskStatus = isBlocked ? "blocked" : folder;

      // Try synonym mapping first; fall back to folder-derived canonical.
      const mapped = SYNONYMS[rawStatus];
      const target: TaskStatus =
        mapped !== undefined && synonymMatchesFolder(mapped, folder, isBlocked)
          ? mapped
          : canonical;

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

// Synonym is acceptable only if it's consistent with the folder's allowed
// canonical statuses. A "complete" synonym in tasks/pending/ is wrong —
// fall back to folder-derived canonical so we never silently lie.
function synonymMatchesFolder(
  mapped: TaskStatus,
  folder: TaskStatus,
  isBlocked: boolean,
): boolean {
  if (folder === "active") return mapped === (isBlocked ? "blocked" : "active");
  return mapped === folder;
}
