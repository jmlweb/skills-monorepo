import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity, writeEntity } from "../core/fs.js";
import { normalizeIdInput } from "../core/id.js";
import { EntityNotFoundError } from "../core/errors.js";
import { indexRebuild } from "./index-rebuild.js";
import type { LearningStatus } from "../core/types.js";

export async function learningMove(
  root: string,
  id: string,
  status: "archived",
): Promise<{ id: string; status: LearningStatus; path: string }> {
  const normalizedId = normalizeIdInput(id, "learning");
  const lDir = learningsDir(root);

  const entries = await readdir(lDir);
  const dirName = entries.find((e) => e.startsWith(`${normalizedId}-`) || e === normalizedId);

  if (!dirName) {
    throw new EntityNotFoundError(normalizedId, "learnings");
  }

  const filePath = join(lDir, dirName, "index.md");
  const doc = await readEntity(filePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };
  fm["status"] = status;

  await writeEntity(filePath, fm, doc.body);
  await indexRebuild(root, "learnings");

  return { id: normalizedId, status, path: filePath };
}
