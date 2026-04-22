import { join } from "node:path";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { reportDir } from "../core/paths.js";
import { writeEntity } from "../core/fs.js";
import { nextId } from "./next-id.js";
export async function reportCreate(cwd, input) {
    const id = await nextId(cwd, "report");
    const slug = titleToSlug(input.title);
    const filename = `${id}-${slug}.md`;
    const dir = reportDir(cwd, "pending");
    const filePath = join(dir, filename);
    const frontmatter = {
        id,
        title: input.title,
        type: input.type,
        severity: input.severity,
        status: "pending",
        created: today(),
    };
    await writeEntity(filePath, frontmatter, `\n${input.body}`);
    return { id, path: filePath };
}
