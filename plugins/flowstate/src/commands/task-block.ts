import { join } from "node:path";
import type { TaskStatus } from "../core/types.js";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";

const SEARCH_DIRS: readonly TaskStatus[] = ["pending", "active"];

export async function taskBlock(
  cwd: string,
  id: string,
  reason: string,
): Promise<{ path: string }> {
  let filePath: string | undefined;

  for (const status of SEARCH_DIRS) {
    const dir = taskDir(cwd, status);
    const found = await findEntityFile(dir, id);
    if (found) {
      filePath = join(dir, found);
      break;
    }
  }

  if (!filePath) {
    throw new EntityNotFoundError(id, "tasks/{pending,active}");
  }

  const doc = await readEntity(filePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };

  fm["status"] = "blocked";
  fm["blocked-by"] = reason;

  const date = today();
  const entry = `- [${date}] Blocked: ${reason}`;

  const lines = doc.body.split("\n");
  let insertIndex = lines.length;
  while (insertIndex > 0 && lines[insertIndex - 1]!.trim() === "") {
    insertIndex--;
  }
  lines.splice(insertIndex, 0, entry);
  const body = lines.join("\n");

  await writeEntity(filePath, fm, body);
  return { path: filePath };
}
