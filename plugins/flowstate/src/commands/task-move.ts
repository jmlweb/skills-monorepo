import { join } from "node:path";
import type { TaskStatus } from "../core/types.js";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { indexRebuild } from "./index-rebuild.js";

const STATUS_TO_DIR: Record<string, TaskStatus> = {
  active: "active",
  complete: "complete",
  pending: "pending",
};

const SEARCH_DIRS: readonly TaskStatus[] = ["pending", "active", "complete"];

export async function taskMove(
  cwd: string,
  id: string,
  to: "active" | "complete" | "pending",
): Promise<{ path: string }> {
  // Find the task in any directory
  let sourcePath: string | undefined;
  let sourceDir: string | undefined;
  let fileName: string | undefined;

  for (const status of SEARCH_DIRS) {
    const dir = taskDir(cwd, status);
    const found = await findEntityFile(dir, id);
    if (found) {
      sourcePath = join(dir, found);
      sourceDir = dir;
      fileName = found;
      break;
    }
  }

  if (!sourcePath || !sourceDir || !fileName) {
    throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
  }

  const doc = await readEntity(sourcePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };
  const date = today();

  // Update frontmatter based on target
  fm["status"] = to === "active" && fm["blocked-by"] ? "blocked" : to;

  if (to === "active" && !fm["started"]) {
    fm["started"] = date;
  }
  if (to === "complete") {
    fm["completed"] = date;
    if (!fm["started"]) fm["started"] = date;
  }

  // Add progress log entry
  const actionMap: Record<string, string> = {
    active: "Started",
    complete: "Completed",
    pending: "Returned to pending",
  };
  const logEntry = `- [${date}] ${actionMap[to] ?? to}`;
  const body = appendProgressLog(doc.body, logEntry);

  const destDir = taskDir(cwd, STATUS_TO_DIR[to]!);
  const destPath = join(destDir, fileName);

  await writeEntity(sourcePath, fm, body);

  if (sourcePath !== destPath) {
    await moveFile(sourcePath, destPath);
  }

  // Rebuild index from filesystem to avoid stale read-modify-write races
  await indexRebuild(cwd, "tasks");

  return { path: destPath };
}

function appendProgressLog(body: string, entry: string): string {
  const lines = body.split("\n");
  // Find last non-empty line (progress log entries are at the end)
  let insertIndex = lines.length;
  // Just append at end
  while (insertIndex > 0 && lines[insertIndex - 1]!.trim() === "") {
    insertIndex--;
  }
  lines.splice(insertIndex, 0, entry);
  return lines.join("\n");
}
