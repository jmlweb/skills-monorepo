import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ENTITY_PREFIXES } from "./types.js";
import { ENTITY_DIRS, ideaDir, reportDir, taskDir, taskIndexPath } from "./paths.js";
import { findEntityFile, listFiles, moveFile, readEntity, writeEntity } from "./fs.js";
import { formatId } from "./id.js";
import { titleToSlug } from "./slug.js";
import { addTableRow } from "./markdown.js";
import { indexRebuild } from "../commands/index-rebuild.js";
// The .backlog/ directory backend: one markdown file per entity, one folder per bucket,
// and tasks/index.md kept in step with the task files.
export class FileStore {
    root;
    constructor(root) {
        this.root = root;
    }
    async list(type, buckets) {
        const entities = [];
        for (const bucket of buckets) {
            const dir = this.dir(type, bucket);
            if (this.isMissingTypeFolder(type, dir))
                continue;
            for (const file of await listFiles(dir)) {
                if (file.name === "index.md")
                    continue;
                entities.push(await this.read(type, bucket, join(dir, file.name)));
            }
        }
        return entities;
    }
    async find(type, id, buckets) {
        for (const bucket of buckets) {
            const dir = this.dir(type, bucket);
            if (this.isMissingTypeFolder(type, dir))
                continue;
            const fileName = await findEntityFile(dir, id);
            if (fileName)
                return this.read(type, bucket, join(dir, fileName));
        }
        return undefined;
    }
    async create(type, input) {
        const id = await nextFileId(this.root, type);
        const path = join(this.dir(type, "pending"), `${id}-${titleToSlug(input.title)}.md`);
        const frontmatter = input.frontmatter(id);
        await writeEntity(path, frontmatter, input.body);
        if (type === "task")
            await this.addTaskIndexRow(frontmatter);
        return { type, id, bucket: "pending", frontmatter, body: input.body, path };
    }
    async save(entity, frontmatter, body, to) {
        await writeEntity(entity.path, { ...frontmatter }, body);
        if (to === undefined)
            return { ...entity, frontmatter, body };
        const path = join(this.dir(entity.type, to), basename(entity.path));
        if (path !== entity.path)
            await moveFile(entity.path, path);
        if (entity.type === "task")
            await indexRebuild(this.root, "tasks");
        return { ...entity, bucket: to, frontmatter, body, path };
    }
    // Backlogs set up before ideas or reports existed lack that folder, and git drops it
    // when empty, so it reads as "none yet". A missing tasks/ or root still throws (LRN-001).
    isMissingTypeFolder(type, dir) {
        return type !== "task" && existsSync(this.root) && !existsSync(dirname(dir));
    }
    dir(type, bucket) {
        if (type === "task")
            return taskDir(this.root, bucket);
        // Ideas and reports have no "active" folder; only tasks ever reach it.
        const closable = bucket === "complete" ? "complete" : "pending";
        return type === "idea" ? ideaDir(this.root, closable) : reportDir(this.root, closable);
    }
    async read(type, bucket, path) {
        const doc = await readEntity(path);
        const frontmatter = doc.frontmatter;
        return { type, id: String(frontmatter["id"] ?? ""), bucket, frontmatter, body: doc.body, path };
    }
    async addTaskIndexRow(frontmatter) {
        const indexPath = taskIndexPath(this.root);
        const tags = Array.isArray(frontmatter["tags"]) ? frontmatter["tags"].join(", ") : "";
        const row = `| ${String(frontmatter["id"])} | ${String(frontmatter["title"])} | ${String(frontmatter["priority"])} | ${tags} | ${String(frontmatter["created"])} |`;
        const content = addTableRow(await readFile(indexPath, "utf-8"), "Pending Tasks", row);
        await writeFile(indexPath, incrementStat(content, "Pending"), "utf-8");
    }
}
// Highest existing number of the type plus one, across every bucket folder.
export async function nextFileId(root, type) {
    const prefix = ENTITY_PREFIXES[type];
    let maxNum = 0;
    for (const { dir } of ENTITY_DIRS[type]) {
        try {
            const entries = await readdir(join(root, dir));
            for (const entry of entries) {
                const match = entry.match(new RegExp(`^${prefix}-(\\d{3})`));
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum)
                        maxNum = num;
                }
            }
        }
        catch {
            // Directory might not exist
        }
    }
    return formatId(type, maxNum + 1);
}
function incrementStat(content, label) {
    const pattern = new RegExp(`\\| ${label} \\| (\\d+) \\|`);
    const match = content.match(pattern);
    if (!match)
        return content;
    const current = parseInt(match[1], 10);
    return content.replace(pattern, `| ${label} | ${current + 1} |`);
}
