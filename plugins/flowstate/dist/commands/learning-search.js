import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { listLearningFiles, readEntity } from "../core/fs.js";
import { learningSources, } from "../core/registry.js";
const STOPWORDS = new Set([
    "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "as", "is", "it", "and", "or", "not", "be", "if", "so", "no", "up",
    "add", "fix", "update", "implement", "create", "remove", "change", "set",
    "use", "make", "ensure", "support", "handle", "move", "run", "get", "check",
]);
export async function learningSearch(root, input) {
    const limit = input.limit ?? 3;
    const scored = [];
    const queryTerms = input.query
        ? input.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2 && !STOPWORDS.has(t))
        : [];
    const inputTags = input.tags?.map((t) => t.toLowerCase()) ?? [];
    for (const source of learningSources(root, input.scope ?? "all", input.shared ?? [])) {
        const lDir = learningsDir(source.root);
        for (const entry of await listLearningFiles(lDir)) {
            const indexFile = join(lDir, entry, "index.md");
            try {
                const doc = await readEntity(indexFile);
                const fm = doc.frontmatter;
                // Skip non-active learnings
                const status = fm.status || "active";
                if (status !== "active")
                    continue;
                const learningTags = (Array.isArray(fm.tags) ? fm.tags : []).map((t) => String(t).toLowerCase());
                const titleLower = String(fm.title ?? "").toLowerCase();
                const bodyLower = doc.body.toLowerCase();
                let score = 0;
                const reasons = [];
                // Exact tag match: +3 each
                for (const inputTag of inputTags) {
                    if (learningTags.includes(inputTag)) {
                        score += 3;
                        reasons.push(`tag:${inputTag}`);
                    }
                    else {
                        // Partial tag match (substring): +1
                        const partial = learningTags.find((lt) => lt.includes(inputTag) || inputTag.includes(lt));
                        if (partial) {
                            score += 1;
                            reasons.push(`tag~${partial}`);
                        }
                    }
                }
                // Query keyword match in title: +2 each
                for (const term of queryTerms) {
                    if (titleLower.includes(term)) {
                        score += 2;
                        reasons.push(`title:${term}`);
                    }
                    else if (bodyLower.includes(term)) {
                        // Query keyword match in body: +1 each
                        score += 1;
                        reasons.push(`body:${term}`);
                    }
                }
                if (score > 0) {
                    scored.push({
                        id: String(fm.id),
                        title: String(fm.title),
                        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
                        task: String(fm.task ?? ""),
                        created: String(fm.created),
                        score,
                        reasons,
                        ...(input.includeBody ? { body: doc.body } : {}),
                        backlog: source.root,
                        source: source.label,
                    });
                }
            }
            catch {
                // Skip invalid entries
            }
        }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
}
