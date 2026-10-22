import { today } from "../core/date.js";
import { embedUnderDescription } from "../core/markdown.js";
export async function taskCreate(store, input) {
    const date = today();
    const criteriaLines = input.criteria.length > 0
        ? input.criteria.map((c) => `- [ ] ${c}`).join("\n")
        : "";
    const { description, notes } = embedUnderDescription(input.description);
    const body = `
# ${input.title}

## Description

${description}

## Acceptance Criteria

${criteriaLines}

## Notes
${notes ? `\n${notes}\n` : ""}
## Learnings

## Progress Log

- [${date}] Created`;
    const created = await store.create("task", {
        title: input.title,
        frontmatter: (id) => ({
            id,
            title: input.title,
            status: "pending",
            priority: input.priority,
            tags: [...input.tags],
            created: date,
            source: input.source,
            "depends-on": [...input.dependsOn],
        }),
        body,
    });
    return { id: created.id, path: created.path };
}
