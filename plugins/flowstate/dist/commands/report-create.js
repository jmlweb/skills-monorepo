import { today } from "../core/date.js";
export async function reportCreate(store, input) {
    const created = await store.create("report", {
        title: input.title,
        frontmatter: (id) => ({
            id,
            title: input.title,
            type: input.type,
            severity: input.severity,
            status: "pending",
            created: today(),
        }),
        body: `\n${input.body}`,
    });
    return { id: created.id, path: created.path };
}
