import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { indexRebuild } from "./index-rebuild.js";
const STATUS_TO_DIR = {
    active: "active",
    complete: "complete",
    pending: "pending",
};
const SEARCH_DIRS = ["pending", "active", "complete"];
export async function taskMove(cwd, id, to) {
    // Find the task in any directory
    let sourcePath;
    let sourceDir;
    let fileName;
    for (const status of SEARCH_DIRS) {
        const dir = taskDir(cwd, status);
        const found = await findEntityFile(dir, id);
        if (found) {
            sourcePath = join(dir, found);
            sourceDir = dir;
            fileName = found;
            break;
        }
    }
    if (!sourcePath || !sourceDir || !fileName) {
        throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
    }
    const doc = await readEntity(sourcePath);
    const fm = { ...doc.frontmatter };
    const date = today();
    // Update frontmatter based on target
    fm["status"] = to === "active" && fm["blocked-by"] ? "blocked" : to;
    if (to === "active" && !fm["started"]) {
        fm["started"] = date;
    }
    if (to === "complete") {
        fm["completed"] = date;
        if (!fm["started"])
            fm["started"] = date;
    }
    // Add progress log entry
    const actionMap = {
        active: "Started",
        complete: "Completed",
        pending: "Returned to pending",
    };
    const logEntry = `- [${date}] ${actionMap[to] ?? to}`;
    const body = appendProgressLog(doc.body, logEntry);
    const destDir = taskDir(cwd, STATUS_TO_DIR[to]);
    const destPath = join(destDir, fileName);
    await writeEntity(sourcePath, fm, body);
    if (sourcePath !== destPath) {
        await moveFile(sourcePath, destPath);
    }
    // Rebuild index from filesystem to avoid stale read-modify-write races
    await indexRebuild(cwd, "tasks");
    return { path: destPath };
}
function appendProgressLog(body, entry) {
    const lines = body.split("\n");
    // Find last non-empty line (progress log entries are at the end)
    let insertIndex = lines.length;
    // Just append at end
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
        insertIndex--;
    }
    lines.splice(insertIndex, 0, entry);
    return lines.join("\n");
}
