import { BUCKETS } from "../core/store.js";
import { EntityNotFoundError } from "../core/errors.js";
import { mergeDuplicateNotes } from "../core/markdown.js";
export async function taskNormalize(store, id) {
    const task = await store.find("task", id, BUCKETS.task);
    if (!task)
        throw new EntityNotFoundError(id, "tasks");
    const body = mergeDuplicateNotes(task.body);
    if (body === task.body)
        return { id, path: task.path, changed: false };
    await store.save(task, task.frontmatter, body);
    return { id, path: task.path, changed: true };
}
