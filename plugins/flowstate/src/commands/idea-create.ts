import type { Complexity } from "../core/types.js";
import type { BacklogStore } from "../core/store.js";
import { today } from "../core/date.js";

export interface IdeaCreateInput {
  readonly title: string;
  readonly complexity: Complexity;
  readonly body: string;
}

export async function ideaCreate(
  store: BacklogStore,
  input: IdeaCreateInput,
): Promise<{ id: string; path: string }> {
  const created = await store.create("idea", {
    title: input.title,
    frontmatter: (id) => ({
      id,
      title: input.title,
      status: "pending",
      created: today(),
      complexity: input.complexity,
    }),
    body: `\n${input.body}`,
  });
  return { id: created.id, path: created.path };
}
