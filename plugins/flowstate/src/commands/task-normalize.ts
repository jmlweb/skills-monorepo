import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { EntityNotFoundError } from "../core/errors.js";
import { mergeDuplicateNotes } from "../core/markdown.js";
import type { TaskStatus } from "../core/types.js";

export interface TaskNormalizeResult {
  readonly id: string;
  readonly path: string;
  readonly changed: boolean;
}

// "blocked" tasks live in active/, so it is not listed separately.
const SEARCH_ORDER: readonly TaskStatus[] = ["pending", "active", "complete"];

export async function taskNormalize(
  root: string,
  id: string,
): Promise<TaskNormalizeResult> {
  for (const status of SEARCH_ORDER) {
    const dir = taskDir(root, status);
    const fileName = await findEntityFile(dir, id);
    if (!fileName) continue;

    const filePath = join(dir, fileName);
    const doc = await readEntity(filePath);
    const body = mergeDuplicateNotes(doc.body);
    if (body === doc.body) return { id, path: filePath, changed: false };

    await writeEntity(filePath, doc.frontmatter as Record<string, unknown>, body);
    return { id, path: filePath, changed: true };
  }
  throw new EntityNotFoundError(id, "tasks");
}
