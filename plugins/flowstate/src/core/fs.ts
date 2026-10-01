import { readFile, writeFile, mkdir, readdir, rename } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import type { ParsedDocument } from "./types.js";

export async function readEntity(path: string): Promise<ParsedDocument> {
  const content = await readFile(path, "utf-8");
  return parseFrontmatter(content);
}

export async function writeEntity(
  path: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<void> {
  const content = serializeFrontmatter(frontmatter, body);
  // Write-then-rename so concurrent readers never see a truncated file.
  // The .tmp suffix keeps listFiles() (which filters on .md) from picking it up.
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, path);
}

export async function moveFile(src: string, dst: string): Promise<void> {
  await rename(src, dst);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function listFiles(dir: string): Promise<Dirent[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
}

export async function findEntityFile(
  dir: string,
  idPrefix: string,
): Promise<string | undefined> {
  const files = await listFiles(dir);
  const match = files.find((f) => f.name.startsWith(idPrefix + "-"));
  return match?.name;
}
