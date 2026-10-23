import type { EntityType } from "../core/types.js";
import { nextFileId } from "../core/file-store.js";

export async function nextId(root: string, type: EntityType): Promise<string> {
  return nextFileId(root, type);
}
