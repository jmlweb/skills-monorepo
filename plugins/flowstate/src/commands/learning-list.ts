import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { listLearningFiles, readEntity } from "../core/fs.js";
import {
  learningSources,
  type LearningScope,
  type LearningSource,
} from "../core/registry.js";
import type { LearningFrontmatter, LearningStatus } from "../core/types.js";

export type LearningStatusFilter = LearningStatus | "all";

export interface LearningListInput {
  readonly all?: boolean;
  readonly status?: LearningStatusFilter;
  readonly scope?: LearningScope | undefined;
  readonly shared?: readonly LearningSource[] | undefined;
}

export interface LearningListResult {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly tags: readonly string[];
  readonly task: string;
  readonly created: string;
  readonly body: string;
  readonly backlog: string;
  readonly source: string;
}

export async function learningList(
  root: string,
  input: LearningListInput = {},
): Promise<LearningListResult[]> {
  const filter: LearningStatusFilter =
    input.status ?? (input.all ? "all" : "active");

  const results: LearningListResult[] = [];

  for (const source of learningSources(root, input.scope ?? "all", input.shared ?? [])) {
    const lDir = learningsDir(source.root);

    for (const entry of await listLearningFiles(lDir)) {
      const indexFile = join(lDir, entry, "index.md");
      try {
        const doc = await readEntity(indexFile);
        const fm = doc.frontmatter as unknown as LearningFrontmatter;
        const status = String(fm.status ?? "active");

        if (filter !== "all" && status !== filter) continue;

        results.push({
          id: String(fm.id),
          title: String(fm.title),
          status,
          tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
          task: String(fm.task ?? ""),
          created: String(fm.created),
          body: doc.body.trim(),
          backlog: source.root,
          source: source.label,
        });
      } catch {
        // Skip invalid entries
      }
    }
  }

  return results;
}
