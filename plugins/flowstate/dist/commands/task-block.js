import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody } from "../core/markdown.js";
export async function taskBlock(store, id, reason) {
    const task = await store.find("task", id, ["pending", "active"]);
    if (!task) {
        throw new EntityNotFoundError(id, "tasks/{pending,active}");
    }
    const fm = { ...task.frontmatter };
    fm["status"] = "blocked";
    fm["blocked-by"] = reason;
    const date = today();
    const body = appendToBody(task.body, `- [${date}] Blocked: ${reason}`);
    const saved = await store.save(task, fm, body);
    return { path: saved.path };
}
