import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity } from "../core/fs.js";
import type { LearningFrontmatter } from "../core/types.js";

export interface LearningListInput {
  readonly all?: boolean;
}

export interface LearningListResult {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly tags: readonly string[];
  readonly task: string;
  readonly created: string;
  readonly body: string;
}

export async function learningList(
  cwd: string,
  input: LearningListInput = {},
): Promise<LearningListResult[]> {
  const lDir = learningsDir(cwd);

  let entries: string[];
  try {
    entries = await readdir(lDir).then((e) =>
      e.filter((name) => name.startsWith("LRN-")).sort(),
    );
  } catch {
    return [];
  }

  const results: LearningListResult[] = [];

  for (const entry of entries) {
    const indexFile = join(lDir, entry, "index.md");
    try {
      const doc = await readEntity(indexFile);
      const fm = doc.frontmatter as unknown as LearningFrontmatter;
      const status = String(fm.status ?? "active");

      if (!input.all && status !== "active") continue;

      results.push({
        id: String(fm.id),
        title: String(fm.title),
        status,
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        task: String(fm.task ?? ""),
        created: String(fm.created),
        body: doc.body.trim(),
      });
    } catch {
      // Skip invalid entries
    }
  }

  return results;
}
