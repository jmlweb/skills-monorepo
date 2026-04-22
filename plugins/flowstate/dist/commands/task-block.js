import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { appendToBody } from "../core/markdown.js";
const SEARCH_DIRS = ["pending", "active"];
export async function taskBlock(cwd, id, reason) {
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
        throw new EntityNotFoundError(id, "tasks/{pending,active}");
    }
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    fm["status"] = "blocked";
    fm["blocked-by"] = reason;
    const date = today();
    const body = appendToBody(doc.body, `- [${date}] Blocked: ${reason}`);
    await writeEntity(filePath, fm, body);
    return { path: filePath };
}
