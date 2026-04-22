import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";
export async function taskList(cwd, status, limit) {
    const statuses = status
        ? [status]
        : ["pending", "active", "complete"];
    const items = [];
    for (const s of statuses) {
        const dir = taskDir(cwd, s);
        const files = await listFiles(dir);
        for (const file of files) {
            if (file.name === "index.md")
                continue;
            const filePath = join(dir, file.name);
            const doc = await readEntity(filePath);
            const fm = doc.frontmatter;
            const item = {
                id: String(fm["id"] ?? ""),
                title: String(fm["title"] ?? ""),
                status: String(fm["status"] ?? s),
                priority: String(fm["priority"] ?? ""),
                tags: Array.isArray(fm["tags"]) ? fm["tags"] : [],
                created: String(fm["created"] ?? ""),
                started: fm["started"] ? String(fm["started"]) : undefined,
                completed: fm["completed"] ? String(fm["completed"]) : undefined,
                blockedBy: fm["blocked-by"] ? String(fm["blocked-by"]) : undefined,
                path: filePath,
            };
            // Filter blocked tasks when status=blocked
            if (status === "blocked" && !fm["blocked-by"])
                continue;
            items.push(item);
        }
    }
    items.sort((a, b) => a.priority.localeCompare(b.priority));
    return limit ? items.slice(0, limit) : items;
}
