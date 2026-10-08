import { join } from "node:path";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { ideaDir } from "../core/paths.js";
import { writeEntity } from "../core/fs.js";
import { nextId } from "./next-id.js";
export async function ideaCreate(root, input) {
    const id = await nextId(root, "idea");
    const slug = titleToSlug(input.title);
    const filename = `${id}-${slug}.md`;
    const dir = ideaDir(root, "pending");
    const filePath = join(dir, filename);
    const frontmatter = {
        id,
        title: input.title,
        status: "pending",
        created: today(),
        complexity: input.complexity,
    };
    await writeEntity(filePath, frontmatter, `\n${input.body}`);
    return { id, path: filePath };
}
