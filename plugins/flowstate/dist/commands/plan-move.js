import { join } from "node:path";
import { planDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
export async function planMove(cwd, id, status, taskId) {
    const pendingDir = planDir(cwd, "pending");
    const fileName = await findEntityFile(pendingDir, id);
    if (!fileName) {
        throw new EntityNotFoundError(id, "plans/pending");
    }
    const sourcePath = join(pendingDir, fileName);
    const doc = await readEntity(sourcePath);
    const fm = { ...doc.frontmatter };
    fm["status"] = status;
    fm["reviewed"] = today();
    if (taskId) {
        fm["task-id"] = taskId;
    }
    await writeEntity(sourcePath, fm, doc.body);
    const destDir = planDir(cwd, "complete");
    const destPath = join(destDir, fileName);
    await moveFile(sourcePath, destPath);
    return { path: destPath };
}
