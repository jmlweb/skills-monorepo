import type { ReportType, Severity } from "../core/types.js";
import type { BacklogStore } from "../core/store.js";
import { today } from "../core/date.js";

export interface ReportCreateInput {
  readonly title: string;
  readonly type: ReportType;
  readonly severity: Severity;
  readonly body: string;
}

export async function reportCreate(
  store: BacklogStore,
  input: ReportCreateInput,
): Promise<{ id: string; path: string }> {
  const created = await store.create("report", {
    title: input.title,
    frontmatter: (id) => ({
      id,
      title: input.title,
      type: input.type,
      severity: input.severity,
      status: "pending",
      created: today(),
    }),
    body: `\n${input.body}`,
  });
  return { id: created.id, path: created.path };
}
