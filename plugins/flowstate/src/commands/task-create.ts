import type { Priority } from "../core/types.js";
import type { BacklogStore } from "../core/store.js";
import { today } from "../core/date.js";
import { embedUnderDescription } from "../core/markdown.js";

export interface TaskCreateInput {
  readonly title: string;
  readonly priority: Priority;
  readonly tags: readonly string[];
  readonly description: string;
  readonly criteria: readonly string[];
  readonly source: string;
  readonly dependsOn: readonly string[];
}

export interface TaskCreateResult {
  readonly id: string;
  readonly path: string;
}

export async function taskCreate(
  store: BacklogStore,
  input: TaskCreateInput,
): Promise<TaskCreateResult> {
  const date = today();

  const criteriaLines =
    input.criteria.length > 0
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
