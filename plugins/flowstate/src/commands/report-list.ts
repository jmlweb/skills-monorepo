import type { BacklogStore, ClosableBucket } from "../core/store.js";

export type ReportListStatus = "pending" | "complete" | "all";

export interface ReportListInput {
  readonly status?: ReportListStatus;
  readonly limit?: number;
}

export interface ReportListItem {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly severity: string;
  readonly status: string;
  readonly created: string;
  readonly triaged: string | undefined;
  readonly taskId: string | undefined;
  readonly path: string;
}

export async function reportList(
  store: BacklogStore,
  input: ReportListInput = {},
): Promise<ReportListItem[]> {
  const filter = input.status ?? "pending";
  const buckets: ClosableBucket[] =
    filter === "all" ? ["pending", "complete"] : [filter];

  const items: ReportListItem[] = [];

  for (const report of await store.list("report", buckets)) {
    const fm = report.frontmatter;
    items.push({
      id: String(fm["id"] ?? ""),
      title: String(fm["title"] ?? ""),
      type: String(fm["type"] ?? ""),
      severity: String(fm["severity"] ?? ""),
      status: String(fm["status"] ?? report.bucket),
      created: String(fm["created"] ?? ""),
      triaged: fm["triaged"] ? String(fm["triaged"]) : undefined,
      taskId: fm["task-id"] ? String(fm["task-id"]) : undefined,
      path: report.path,
    });
  }

  items.sort((a, b) => a.id.localeCompare(b.id));
  return input.limit ? items.slice(0, input.limit) : items;
}
