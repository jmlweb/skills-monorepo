import { readFile, writeFile, mkdir, readdir, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
    await writeFile(tmp, content, "utf-8");
    await rename(tmp, path);
}
export async function moveFile(src, dst) {
    await rename(src, dst);
}
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
export async function listFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
}
export async function findEntityFile(dir, idPrefix) {
    const files = await listFiles(dir);
    const match = files.find((f) => f.name.startsWith(idPrefix + "-"));
    return match?.name;
}
