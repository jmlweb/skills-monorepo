import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
const SEARCH_DIRS = ["pending", "active", "complete"];
export async function taskUpdate(cwd, id, updates, log) {
    let filePath;
    for (const status of SEARCH_DIRS) {
        const dir = taskDir(cwd, status);
        const found = await findEntityFile(dir, id);
        if (found) {
            filePath = join(dir, found);
            break;
        }
    }
    if (!filePath) {
        throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
    }
    const REJECTED_KEYS = ["status", "blocked-by"];
    for (const key of Object.keys(updates)) {
        if (REJECTED_KEYS.includes(key)) {
            throw new Error(`Cannot set "${key}" via task-update. Use task-move for status transitions or task-block/task-unblock for blocking.`);
        }
    }
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    for (const [key, value] of Object.entries(updates)) {
        fm[key] = value;
    }
    let body = doc.body;
    if (log) {
        const date = today();
        const entry = `- [${date}] ${log}`;
        body = appendToEnd(body, entry);
    }
    await writeEntity(filePath, fm, body);
    return { path: filePath };
}
function appendToEnd(body, entry) {
    const lines = body.split("\n");
    let insertIndex = lines.length;
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
        insertIndex--;
    }
    lines.splice(insertIndex, 0, entry);
    return lines.join("\n");
}
