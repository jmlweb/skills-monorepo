import { BUCKETS } from "../core/store.js";
export async function taskList(store, status, limit) {
    // Blocked tasks sit in the active bucket.
    const buckets = !status
        ? BUCKETS.task
        : [status === "blocked" ? "active" : status];
    const items = [];
    for (const task of await store.list("task", buckets)) {
        const fm = task.frontmatter;
        // Filter blocked tasks when status=blocked
        if (status === "blocked" && !fm["blocked-by"])
            continue;
        items.push({
            id: String(fm["id"] ?? ""),
            title: String(fm["title"] ?? ""),
            status: String(fm["status"] ?? task.bucket),
            priority: String(fm["priority"] ?? ""),
            tags: Array.isArray(fm["tags"]) ? fm["tags"] : [],
            created: String(fm["created"] ?? ""),
            started: fm["started"] ? String(fm["started"]) : undefined,
            completed: fm["completed"] ? String(fm["completed"]) : undefined,
            blockedBy: fm["blocked-by"] ? String(fm["blocked-by"]) : undefined,
            path: task.path,
        });
    }
    items.sort((a, b) => a.priority.localeCompare(b.priority));
    return limit ? items.slice(0, limit) : items;
}
