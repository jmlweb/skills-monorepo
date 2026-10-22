export async function ideaList(store, input = {}) {
    const filter = input.status ?? "pending";
    const buckets = filter === "all" ? ["pending", "complete"] : [filter];
    const items = [];
    for (const idea of await store.list("idea", buckets)) {
        const fm = idea.frontmatter;
        items.push({
            id: String(fm["id"] ?? ""),
            title: String(fm["title"] ?? ""),
            status: String(fm["status"] ?? idea.bucket),
            complexity: String(fm["complexity"] ?? ""),
            created: String(fm["created"] ?? ""),
            reviewed: fm["reviewed"] ? String(fm["reviewed"]) : undefined,
            taskId: fm["task-id"] ? String(fm["task-id"]) : undefined,
            path: idea.path,
        });
    }
    items.sort((a, b) => a.id.localeCompare(b.id));
    return input.limit ? items.slice(0, input.limit) : items;
}
