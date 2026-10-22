import type { BacklogStore, ClosableBucket } from "../core/store.js";

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
  store: BacklogStore,
  input: IdeaListInput = {},
): Promise<IdeaListItem[]> {
  const filter = input.status ?? "pending";
  const buckets: ClosableBucket[] =
    filter === "all" ? ["pending", "complete"] : [filter];

  const items: IdeaListItem[] = [];

  for (const idea of await store.list("idea", buckets)) {
    const fm = idea.frontmatter;
    items.push({
      id: String(fm["id"] ?? ""),
      title: String(fm["title"] ?? ""),
      status: String(fm["status"] ?? idea.bucket),
      complexity: String(fm["complexity"] ?? ""),
      created: String(fm["created"] ?? ""),
      reviewed: fm["reviewed"] ? String(fm["reviewed"]) : undefined,
      taskId: fm["task-id"] ? String(fm["task-id"]) : undefined,
      path: idea.path,
    });
  }

  items.sort((a, b) => a.id.localeCompare(b.id));
  return input.limit ? items.slice(0, input.limit) : items;
}
