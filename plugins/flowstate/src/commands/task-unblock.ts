import type { BacklogStore } from "../core/store.js";
import { BUCKETS } from "../core/store.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody } from "../core/markdown.js";

export async function taskUnblock(
  store: BacklogStore,
  id: string,
  resolution?: string,
): Promise<{ path: string }> {
  const task = await store.find("task", id, BUCKETS.task);
  if (!task) {
    throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
  }

  const fm = { ...task.frontmatter };

  // Remove blocked-by
  delete fm["blocked-by"];

  // Restore status based on whether task was started
  fm["status"] = fm["started"] ? "active" : "pending";

  const date = today();
  const logMsg = resolution ? `Unblocked: ${resolution}` : "Unblocked";
  const body = appendToBody(task.body, `- [${date}] ${logMsg}`);

  const saved = await store.save(task, fm, body);
  return { path: saved.path };
}
