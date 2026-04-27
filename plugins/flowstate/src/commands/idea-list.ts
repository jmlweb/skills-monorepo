import { join } from "node:path";
import { ideaDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";

export type IdeaListStatus = "pending" | "complete" | "all";

export interface IdeaListInput {
  readonly status?: IdeaListStatus;
  readonly limit?: number;
}

export interface IdeaListItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly complexity: string;
  readonly created: string;
  readonly reviewed: string | undefined;
  readonly taskId: string | undefined;
  readonly path: string;
}

export async function ideaList(
  cwd: string,
  input: IdeaListInput = {},
): Promise<IdeaListItem[]> {
  const filter = input.status ?? "pending";
  const buckets: ("pending" | "complete")[] =
    filter === "all" ? ["pending", "complete"] : [filter];

  const items: IdeaListItem[] = [];

  for (const bucket of buckets) {
    const dir = ideaDir(cwd, bucket);
    const files = await listFiles(dir);

    for (const file of files) {
      if (file.name === "index.md") continue;
      const filePath = join(dir, file.name);
      const doc = await readEntity(filePath);
      const fm = doc.frontmatter as Record<string, unknown>;

      items.push({
        id: String(fm["id"] ?? ""),
        title: String(fm["title"] ?? ""),
        status: String(fm["status"] ?? bucket),
        complexity: String(fm["complexity"] ?? ""),
        created: String(fm["created"] ?? ""),
        reviewed: fm["reviewed"] ? String(fm["reviewed"]) : undefined,
        taskId: fm["task-id"] ? String(fm["task-id"]) : undefined,
        path: filePath,
      });
    }
  }

  items.sort((a, b) => a.id.localeCompare(b.id));
  return input.limit ? items.slice(0, input.limit) : items;
}
