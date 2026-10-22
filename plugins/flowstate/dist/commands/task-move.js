import { BUCKETS } from "../core/store.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody, unverifiedCriteria } from "../core/markdown.js";
export async function taskMove(store, id, to) {
    const task = await store.find("task", id, BUCKETS.task);
    if (!task) {
        throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
    }
    const fm = { ...task.frontmatter };
    const date = today();
    // Update frontmatter based on target
    fm["status"] = to === "active" && fm["blocked-by"] ? "blocked" : to;
    if (to === "active" && !fm["started"]) {
        fm["started"] = date;
    }
    if (to === "complete") {
        fm["completed"] = date;
        if (!fm["started"])
            fm["started"] = date;
    }
    const actionMap = {
        active: "Started",
        complete: "Completed",
        pending: "Returned to pending",
        blocked: "Blocked",
    };
    const body = appendToBody(task.body, `- [${date}] ${actionMap[to]}`);
    const moved = await store.save(task, fm, body, to);
    return to === "complete"
        ? { path: moved.path, unverifiedCriteria: unverifiedCriteria(task.body) }
        : { path: moved.path };
}
