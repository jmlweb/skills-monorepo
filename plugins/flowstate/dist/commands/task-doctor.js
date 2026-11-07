import { join } from "node:path";
import { BUCKETS, taskStatusOf } from "../core/store.js";
import { listFiles, readEntity, writeEntity } from "../core/fs.js";
// The GitHub equivalent: the issue state and the metadata block are the truth, labels
// are what drifts (someone adds status:blocked on github.com), so labels get realigned.
// Closed ideas and reports with no, two or unknown final-state labels cannot be fixed
// by guessing; they are listed for a human to relabel.
export async function taskDoctorGithub(store, options = {}) {
    const apply = options.dryRun !== true;
    const fixed = [];
    const invalid = [];
    let scanned = 0;
    for (const type of ["task", "idea", "report"]) {
        for (const issue of await store.inspect(type)) {
            scanned += 1;
            if (!issue.entity) {
                invalid.push({ id: `#${issue.number}`, path: issue.url, reason: issue.error ?? "unreadable" });
                continue;
            }
            const diff = await store.repairLabels(issue.entity, apply);
            if (diff.add.length === 0 && diff.remove.length === 0)
                continue;
            fixed.push({
                id: issue.entity.id,
                path: issue.url,
                added: diff.add.join(","),
                removed: diff.remove.join(","),
            });
        }
    }
    return { scanned, fixed, invalid };
}
// The folder plus `blocked-by` decide the status (taskStatusOf); the frontmatter never
// does. So a synonym like "done" in complete/ becomes "complete", a "completed" in
// pending/ falls back to "pending", and a blocked task keeps "blocked" in pending/ or active/.
export async function taskDoctor(root, options = {}) {
    const dryRun = options.dryRun === true;
    const fixes = [];
    let scanned = 0;
    for (const folder of BUCKETS.task) {
        const dir = join(root, "tasks", folder);
        let files;
        try {
            files = await listFiles(dir);
        }
        catch {
            continue;
        }
        for (const file of files) {
            if (file.name === "index.md")
                continue;
            const filePath = join(dir, file.name);
            const doc = await readEntity(filePath);
            const fm = { ...doc.frontmatter };
            const id = String(fm["id"] ?? "");
            if (!id)
                continue;
            scanned += 1;
            const rawStatus = String(fm["status"] ?? "").toLowerCase().trim();
            const target = taskStatusOf(folder, fm);
            if (rawStatus === target)
                continue;
            fixes.push({
                id,
                path: filePath,
                folder,
                statusBefore: String(fm["status"] ?? ""),
                statusAfter: target,
            });
            if (!dryRun) {
                fm["status"] = target;
                await writeEntity(filePath, fm, doc.body);
            }
        }
    }
    return { scanned, fixed: fixes };
}
