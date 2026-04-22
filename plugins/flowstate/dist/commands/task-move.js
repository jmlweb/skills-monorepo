import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody } from "../core/markdown.js";
import { indexRebuild } from "./index-rebuild.js";
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
    const actionMap = {
        active: "Started",
        complete: "Completed",
        pending: "Returned to pending",
        blocked: "Blocked",
    };
    const body = appendToBody(doc.body, `- [${date}] ${actionMap[to]}`);
    const destPath = join(taskDir(cwd, to), fileName);
    await writeEntity(sourcePath, fm, body);
    if (sourcePath !== destPath) {
        await moveFile(sourcePath, destPath);
    }
    await indexRebuild(cwd, "tasks");
    return { path: destPath };
}
