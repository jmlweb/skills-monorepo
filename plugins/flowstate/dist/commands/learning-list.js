import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { listLearningFiles, readEntity } from "../core/fs.js";
import { learningSources, } from "../core/registry.js";
export async function learningList(root, input = {}) {
    const filter = input.status ?? (input.all ? "all" : "active");
    const results = [];
    for (const source of learningSources(root, input.scope ?? "all", input.shared ?? [])) {
        const lDir = learningsDir(source.root);
        for (const entry of await listLearningFiles(lDir)) {
            const indexFile = join(lDir, entry, "index.md");
            try {
                const doc = await readEntity(indexFile);
                const fm = doc.frontmatter;
                const status = String(fm.status ?? "active");
                if (filter !== "all" && status !== filter)
                    continue;
                results.push({
                    id: String(fm.id),
                    title: String(fm.title),
                    status,
                    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
                    task: String(fm.task ?? ""),
                    created: String(fm.created),
                    body: doc.body.trim(),
                    backlog: source.root,
                    source: source.label,
                });
            }
            catch {
                // Skip invalid entries
            }
        }
    }
    return results;
}
