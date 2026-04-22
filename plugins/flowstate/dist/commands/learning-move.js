import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity, writeEntity } from "../core/fs.js";
import { normalizeIdInput } from "../core/id.js";
import { EntityNotFoundError } from "../core/errors.js";
export async function learningMove(cwd, id, status) {
    const normalizedId = normalizeIdInput(id, "learning");
    const lDir = learningsDir(cwd);
    const entries = await readdir(lDir);
    const dirName = entries.find((e) => e.startsWith(`${normalizedId}-`) || e === normalizedId);
    if (!dirName) {
        throw new EntityNotFoundError(normalizedId, "learnings");
    }
    const filePath = join(lDir, dirName, "index.md");
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    fm["status"] = status;
    await writeEntity(filePath, fm, doc.body);
    return { id: normalizedId, status, path: filePath };
}
