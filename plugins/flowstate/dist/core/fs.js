import { readFile, writeFile, mkdir, readdir, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
export async function readEntity(path) {
    const content = await readFile(path, "utf-8");
    return parseFrontmatter(content);
}
export async function writeEntity(path, frontmatter, body) {
    const content = serializeFrontmatter(frontmatter, body);
    // Write-then-rename so concurrent readers never see a truncated file.
    // The .tmp suffix keeps listFiles() (which filters on .md) from picking it up.
    const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
    // Git does not keep empty folders, so a status folder can be missing in a fresh clone.
    await mkdir(dirname(path), { recursive: true });
    await writeFile(tmp, content, "utf-8");
    await rename(tmp, path);
}
export async function moveFile(src, dst) {
    await mkdir(dirname(dst), { recursive: true });
    await rename(src, dst);
}
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
export async function listFiles(dir) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
    }
    catch (err) {
        // Git drops empty status folders, so a missing leaf under an existing entity folder
        // means "no entities". A missing parent still throws: that is a wrong cwd (LRN-001).
        if (err.code === "ENOENT" && existsSync(dirname(dir))) {
            return [];
        }
        throw err;
    }
}
export async function findEntityFile(dir, idPrefix) {
    const files = await listFiles(dir);
    const match = files.find((f) => f.name.startsWith(idPrefix + "-"));
    return match?.name;
}
// A missing learnings/ dir is a fresh backlog, so it reads as empty. Any other failure
// must surface: an empty result there would look like "no learnings" (LRN-001).
export async function listLearningFiles(dir) {
    try {
        const names = await readdir(dir);
        return names.filter((name) => name.startsWith("LRN-")).sort();
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
}
