import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity, writeEntity } from "../core/fs.js";
import { normalizeIdInput } from "../core/id.js";
import { EntityNotFoundError } from "../core/errors.js";
import { indexRebuild } from "./index-rebuild.js";

export interface LearningUpdateInput {
  readonly title?: string;
  readonly tags?: readonly string[];
  readonly body?: string;
}

export async function learningUpdate(
  root: string,
  id: string,
  input: LearningUpdateInput,
): Promise<{ id: string; path: string }> {
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

  if (input.title !== undefined) fm["title"] = input.title;
  if (input.tags !== undefined) fm["tags"] = [...input.tags];

  const body = input.body !== undefined ? `\n${input.body}` : doc.body;

  await writeEntity(filePath, fm, body);
  await indexRebuild(root, "learnings");

  return { id: normalizedId, path: filePath };
}
