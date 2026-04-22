import { taskDir, ideaDir, reportDir, learningsDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
export async function stats(cwd) {
    let pending = 0;
    let active = 0;
    let blocked = 0;
    let complete = 0;
    const [taskCounts, pendingIdeas, pendingReports, learnings] = await Promise.all([
        Promise.all(["pending", "active", "complete"].map(async (status) => {
            const dir = taskDir(cwd, status);
            const files = await listFiles(dir);
            const filtered = files.filter((f) => f.name !== "index.md");
            if (status === "active") {
                let activeCount = 0;
                let blockedCount = 0;
                for (const file of filtered) {
                    const doc = await readEntity(join(dir, file.name));
                    const fm = doc.frontmatter;
                    if (fm["blocked-by"]) {
                        blockedCount++;
                    }
                    else {
                        activeCount++;
                    }
                }
                return { status, active: activeCount, blocked: blockedCount, count: 0 };
            }
            return { status, count: filtered.length, active: 0, blocked: 0 };
        })),
        listFiles(ideaDir(cwd, "pending")).then((f) => f.length),
        listFiles(reportDir(cwd, "pending")).then((f) => f.length),
        readdir(learningsDir(cwd)).then((e) => e.filter((n) => n.startsWith("LRN-")).length).catch(() => 0),
    ]);
    for (const c of taskCounts) {
        if (c.status === "pending")
            pending = c.count;
        else if (c.status === "active") {
            active = c.active;
            blocked = c.blocked;
        }
        else if (c.status === "complete")
            complete = c.count;
    }
    return { pending, active, blocked, complete, pendingIdeas, pendingReports, learnings };
}
