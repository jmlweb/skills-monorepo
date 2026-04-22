import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { EntityType } from "../core/types.js";
import { ENTITY_PREFIXES } from "../core/types.js";
import { ENTITY_DIRS, backlogRoot } from "../core/paths.js";
import { formatId } from "../core/id.js";

export async function nextId(cwd: string, type: EntityType): Promise<string> {
  const prefix = ENTITY_PREFIXES[type];
  const root = backlogRoot(cwd);
  const dirs = ENTITY_DIRS[type];
  let maxNum = 0;

  for (const { dir } of dirs) {
    const fullPath = join(root, dir);
    try {
      const entries = await readdir(fullPath);
      for (const entry of entries) {
        const match = entry.match(new RegExp(`^${prefix}-(\\d{3})`));
        if (match) {
          const num = parseInt(match[1]!, 10);
          if (num > maxNum) maxNum = num;
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  return formatId(type, maxNum + 1);
}
