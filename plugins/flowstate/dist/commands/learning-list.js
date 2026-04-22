import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity } from "../core/fs.js";
export async function learningList(cwd, input = {}) {
    const lDir = learningsDir(cwd);
    let entries;
    try {
        entries = await readdir(lDir).then((e) => e.filter((name) => name.startsWith("LRN-")).sort());
    }
    catch {
        return [];
    }
    const results = [];
    for (const entry of entries) {
        const indexFile = join(lDir, entry, "index.md");
        try {
            const doc = await readEntity(indexFile);
            const fm = doc.frontmatter;
            const status = String(fm.status ?? "active");
            if (!input.all && status !== "active")
                continue;
            results.push({
                id: String(fm.id),
                title: String(fm.title),
                status,
                tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
                task: String(fm.task ?? ""),
                created: String(fm.created),
                body: doc.body.trim(),
            });
        }
        catch {
            // Skip invalid entries
        }
    }
    return results;
}
