import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { learningsDir, taskDir } from "../core/paths.js";
import { ensureDir, findEntityFile, writeEntity } from "../core/fs.js";
import { appendToSection, hasSection } from "../core/markdown.js";
import { nextId } from "./next-id.js";
import { indexRebuild } from "./index-rebuild.js";
const TASK_SEARCH_DIRS = ["pending", "active", "complete"];
export async function learningCreate(cwd, input) {
    const id = await nextId(cwd, "learning");
    const slug = titleToSlug(input.title);
    const dir = join(learningsDir(cwd), `${id}-${slug}`);
    const filePath = join(dir, "index.md");
    const date = today();
    await ensureDir(dir);
    const frontmatter = {
        id,
        title: input.title,
        status: "active",
        tags: [...input.tags],
        task: input.task ?? "",
        created: date,
    };
    await writeEntity(filePath, frontmatter, `\n${input.body}`);
    await indexRebuild(cwd, "learnings");
    if (input.task) {
        await appendLearningToTask(cwd, input.task, id, input.title);
    }
    return { id, path: filePath };
}
async function appendLearningToTask(cwd, taskId, learningId, title) {
    for (const status of TASK_SEARCH_DIRS) {
        const dir = taskDir(cwd, status);
        const fileName = await findEntityFile(dir, taskId);
        if (!fileName)
            continue;
        const filePath = join(dir, fileName);
        const content = await readFile(filePath, "utf-8");
        if (!hasSection(content, "Learnings"))
            return;
        const updated = appendToSection(content, "Learnings", `- ${learningId}: ${title}`);
        await writeFile(filePath, updated, "utf-8");
        return;
    }
}
