import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
const SEARCH_DIRS = ["pending", "active", "complete"];
export async function taskUnblock(cwd, id, resolution) {
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
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    // Remove blocked-by
    delete fm["blocked-by"];
    // Restore status based on whether task was started
    fm["status"] = fm["started"] ? "active" : "pending";
    // Add progress log
    const date = today();
    const logMsg = resolution
        ? `Unblocked: ${resolution}`
        : "Unblocked";
    const entry = `- [${date}] ${logMsg}`;
    const lines = doc.body.split("\n");
    let insertIndex = lines.length;
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
        insertIndex--;
    }
    lines.splice(insertIndex, 0, entry);
    const body = lines.join("\n");
    await writeEntity(filePath, fm, body);
    return { path: filePath };
}
