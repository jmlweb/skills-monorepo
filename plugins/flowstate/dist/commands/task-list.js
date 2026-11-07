import { BLOCKABLE_BUCKETS, BUCKETS, taskStatusOf } from "../core/store.js";
export async function taskList(store, status, limit) {
    // pending/active/complete name a bucket, so a blocked task still lists under the bucket
    // it sits in (LRN-040); only "blocked" filters on the derived status.
    const buckets = !status
        ? BUCKETS.task
        : status === "blocked"
            ? BLOCKABLE_BUCKETS
            : [status];
    const items = [];
    for (const task of await store.list("task", buckets)) {
        const fm = task.frontmatter;
        if (status === "blocked" && taskStatusOf(task.bucket, fm) !== "blocked")
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
