import { today } from "../core/date.js";
export async function ideaCreate(store, input) {
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
