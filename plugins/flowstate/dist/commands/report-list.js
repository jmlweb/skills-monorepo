export async function reportList(store, input = {}) {
    const filter = input.status ?? "pending";
    const buckets = filter === "all" ? ["pending", "complete"] : [filter];
    const items = [];
    for (const report of await store.list("report", buckets)) {
        const fm = report.frontmatter;
        items.push({
            id: String(fm["id"] ?? ""),
            title: String(fm["title"] ?? ""),
            type: String(fm["type"] ?? ""),
            severity: String(fm["severity"] ?? ""),
            status: String(fm["status"] ?? report.bucket),
            created: String(fm["created"] ?? ""),
            triaged: fm["triaged"] ? String(fm["triaged"]) : undefined,
            taskId: fm["task-id"] ? String(fm["task-id"]) : undefined,
            path: report.path,
        });
    }
    items.sort((a, b) => a.id.localeCompare(b.id));
    return input.limit ? items.slice(0, input.limit) : items;
}
