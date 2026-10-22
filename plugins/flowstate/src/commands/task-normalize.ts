import type { BacklogStore } from "../core/store.js";
import { BUCKETS } from "../core/store.js";
import { EntityNotFoundError } from "../core/errors.js";
import { mergeDuplicateNotes } from "../core/markdown.js";

export interface TaskNormalizeResult {
  readonly id: string;
  readonly path: string;
  readonly changed: boolean;
}

export async function taskNormalize(
  store: BacklogStore,
  id: string,
): Promise<TaskNormalizeResult> {
  const task = await store.find("task", id, BUCKETS.task);
  if (!task) throw new EntityNotFoundError(id, "tasks");

  const body = mergeDuplicateNotes(task.body);
  if (body === task.body) return { id, path: task.path, changed: false };

  await store.save(task, task.frontmatter, body);
  return { id, path: task.path, changed: true };
}
