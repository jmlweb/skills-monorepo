import { join } from "node:path";
import { ideaDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";

export async function ideaMove(
  cwd: string,
  id: string,
  status: "approved" | "discarded",
  taskId?: string,
): Promise<{ path: string }> {
  const pendingDir = ideaDir(cwd, "pending");
  const fileName = await findEntityFile(pendingDir, id);
  if (!fileName) {
    throw new EntityNotFoundError(id, "ideas/pending");
  }

  const sourcePath = join(pendingDir, fileName);
  const doc = await readEntity(sourcePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };

  fm["status"] = status;
  fm["reviewed"] = today();
  if (taskId) {
    fm["task-id"] = taskId;
  }

  await writeEntity(sourcePath, fm, doc.body);

  const destDir = ideaDir(cwd, "complete");
  const destPath = join(destDir, fileName);
  await moveFile(sourcePath, destPath);

  return { path: destPath };
}
