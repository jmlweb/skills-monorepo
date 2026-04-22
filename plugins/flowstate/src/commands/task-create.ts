import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Priority } from "../core/types.js";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { taskDir, taskIndexPath } from "../core/paths.js";
import { writeEntity } from "../core/fs.js";
import { addTableRow } from "../core/markdown.js";
import { nextId } from "./next-id.js";

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
  cwd: string,
  input: TaskCreateInput,
): Promise<TaskCreateResult> {
  const id = await nextId(cwd, "task");
  const slug = titleToSlug(input.title);
  const filename = `${id}-${slug}.md`;
  const date = today();
  const dir = taskDir(cwd, "pending");
  const filePath = join(dir, filename);

  const frontmatter: Record<string, unknown> = {
    id,
    title: input.title,
    status: "pending",
    priority: input.priority,
    tags: [...input.tags],
    created: date,
    source: input.source,
    "depends-on": [...input.dependsOn],
  };

  const criteriaLines =
    input.criteria.length > 0
      ? input.criteria.map((c) => `- [ ] ${c}`).join("\n")
      : "";

  const body = `
# ${input.title}

## Description

${input.description}

## Acceptance Criteria

${criteriaLines}

## Notes

## Learnings

## Progress Log

- [${date}] Created`;

  await writeEntity(filePath, frontmatter, body);

  // Update task index
  await updateTaskIndex(cwd, id, input, date);

  return { id, path: filePath };
}

async function updateTaskIndex(
  cwd: string,
  id: string,
  input: TaskCreateInput,
  date: string,
): Promise<void> {
  const indexPath = taskIndexPath(cwd);
  let content = await readFile(indexPath, "utf-8");

  const tags = input.tags.length > 0 ? input.tags.join(", ") : "";
  const row = `| ${id} | ${input.title} | ${input.priority} | ${tags} | ${date} |`;
  content = addTableRow(content, "Pending Tasks", row);

  // Update stats
  content = incrementStat(content, "Pending");

  await writeFile(indexPath, content, "utf-8");
}

function incrementStat(content: string, label: string): string {
  const pattern = new RegExp(`\\| ${label} \\| (\\d+) \\|`);
  const match = content.match(pattern);
  if (!match) return content;
  const current = parseInt(match[1]!, 10);
  return content.replace(pattern, `| ${label} | ${current + 1} |`);
}
