import { join } from "node:path";
import { reportDir } from "../core/paths.js";
import { ensureDir, findEntityFile, readEntity, writeEntity, moveFile } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
export async function reportMove(root, id, status, taskId) {
    const pendingDir = reportDir(root, "pending");
    const fileName = await findEntityFile(pendingDir, id);
    if (!fileName) {
        throw new EntityNotFoundError(id, "reports/pending");
    }
    const sourcePath = join(pendingDir, fileName);
    const doc = await readEntity(sourcePath);
    const fm = { ...doc.frontmatter };
    fm["status"] = status;
    fm["triaged"] = today();
    if (taskId) {
        fm["task-id"] = taskId;
    }
    await writeEntity(sourcePath, fm, doc.body);
    const destDir = reportDir(root, "complete");
    const destPath = join(destDir, fileName);
    // Backlogs set up before reports existed have no reports/ folder.
    await ensureDir(destDir);
    await moveFile(sourcePath, destPath);
    return { path: destPath };
}
