import type { BacklogStore } from "../core/store.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";

export async function ideaMove(
  store: BacklogStore,
  id: string,
  status: "approved" | "discarded",
  taskId?: string,
): Promise<{ path: string }> {
  const idea = await store.find("idea", id, ["pending"]);
  if (!idea) {
    throw new EntityNotFoundError(id, "ideas/pending");
  }

  const fm = { ...idea.frontmatter };

  fm["status"] = status;
  fm["reviewed"] = today();
  if (taskId) {
    fm["task-id"] = taskId;
  }

  const moved = await store.save(idea, fm, idea.body, "complete");
  return { path: moved.path };
}
