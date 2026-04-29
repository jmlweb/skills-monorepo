import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { EntityNotFoundError } from "../core/errors.js";
import { validateCompression, } from "../core/compress-validate.js";
const PROTECTED_SECTIONS = ["Acceptance Criteria"];
export async function taskCompress(cwd, id, newBody) {
    const dir = taskDir(cwd, "complete");
    const fileName = await findEntityFile(dir, id);
    if (!fileName) {
        throw new EntityNotFoundError(id, "tasks/complete");
    }
    const filePath = join(dir, fileName);
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    if (fm["compressed"] === true || fm["compressed"] === "true") {
        const bytes = Buffer.byteLength(doc.body, "utf-8");
        return {
            id,
            path: filePath,
            ok: false,
            bytesBefore: bytes,
            bytesAfter: bytes,
            errors: [],
            skippedReason: "already compressed",
        };
    }
    const validation = validateCompression(doc.body, newBody, {
        protectedSections: PROTECTED_SECTIONS,
    });
    if (!validation.ok) {
        return {
            id,
            path: filePath,
            ok: false,
            bytesBefore: validation.bytesBefore,
            bytesAfter: validation.bytesAfter,
            errors: validation.errors,
        };
    }
    fm["compressed"] = true;
    await writeEntity(filePath, fm, newBody);
    return {
        id,
        path: filePath,
        ok: true,
        bytesBefore: validation.bytesBefore,
        bytesAfter: validation.bytesAfter,
        errors: [],
    };
}
