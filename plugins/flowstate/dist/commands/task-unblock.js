import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody } from "../core/markdown.js";
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
    const date = today();
    const logMsg = resolution ? `Unblocked: ${resolution}` : "Unblocked";
    const body = appendToBody(doc.body, `- [${date}] ${logMsg}`);
    await writeEntity(filePath, fm, body);
    return { path: filePath };
}
