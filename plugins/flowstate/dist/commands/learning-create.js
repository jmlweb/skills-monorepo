import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { learningsDir, learningsIndexPath } from "../core/paths.js";
import { ensureDir, writeEntity } from "../core/fs.js";
import { nextId } from "./next-id.js";
export async function learningCreate(cwd, input) {
    const id = await nextId(cwd, "learning");
    const slug = titleToSlug(input.title);
    const dirName = `${id}-${slug}`;
    const dir = join(learningsDir(cwd), dirName);
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
    // Update learnings index
    const indexPath = learningsIndexPath(cwd);
    let indexContent = await readFile(indexPath, "utf-8");
    const tags = input.tags.length > 0 ? input.tags.join(", ") : "";
    const row = `| ${id} | ${input.title} | ${tags} | active | ${date} |`;
    // Append row after last table row (or separator)
    const lines = indexContent.split("\n");
    const separatorIdx = lines.findIndex((l) => l.startsWith("|--"));
    if (separatorIdx !== -1) {
        let lastRowIdx = separatorIdx;
        for (let i = separatorIdx + 1; i < lines.length; i++) {
            if (lines[i].startsWith("|")) {
                lastRowIdx = i;
            }
            else {
                break;
            }
        }
        lines.splice(lastRowIdx + 1, 0, row);
        indexContent = lines.join("\n");
    }
    await writeFile(indexPath, indexContent, "utf-8");
    // If task specified, append learning link to task's Learnings section
    if (input.task) {
        await appendLearningToTask(cwd, input.task, id, input.title);
    }
    return { id, path: filePath };
}
async function appendLearningToTask(cwd, taskId, learningId, title) {
    const { findEntityFile } = await import("../core/fs.js");
    const { taskDir } = await import("../core/paths.js");
    const { appendToSection } = await import("../core/markdown.js");
    const { readFile: rf, writeFile: wf } = await import("node:fs/promises");
    for (const status of ["pending", "active", "complete"]) {
        const dir = taskDir(cwd, status);
        const fileName = await findEntityFile(dir, taskId);
        if (fileName) {
            const filePath = join(dir, fileName);
            let content = await rf(filePath, "utf-8");
            try {
                content = appendToSection(content, "Learnings", `- ${learningId}: ${title}`);
                await wf(filePath, content, "utf-8");
            }
            catch {
                // Learnings section might not exist
            }
            break;
        }
    }
}
