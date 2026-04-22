import { join } from "node:path";
import type { Complexity } from "../core/types.js";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { ideaDir } from "../core/paths.js";
import { writeEntity } from "../core/fs.js";
import { nextId } from "./next-id.js";

export interface IdeaCreateInput {
  readonly title: string;
  readonly complexity: Complexity;
  readonly body: string;
}

export async function ideaCreate(
  cwd: string,
  input: IdeaCreateInput,
): Promise<{ id: string; path: string }> {
  const id = await nextId(cwd, "idea");
  const slug = titleToSlug(input.title);
  const filename = `${id}-${slug}.md`;
  const dir = ideaDir(cwd, "pending");
  const filePath = join(dir, filename);

  const frontmatter: Record<string, unknown> = {
    id,
    title: input.title,
    status: "pending",
    created: today(),
    complexity: input.complexity,
  };

  await writeEntity(filePath, frontmatter, `\n${input.body}`);
  return { id, path: filePath };
}
