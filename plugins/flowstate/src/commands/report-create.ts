import { join } from "node:path";
import type { ReportType, Severity } from "../core/types.js";
import { today } from "../core/date.js";
import { titleToSlug } from "../core/slug.js";
import { reportDir } from "../core/paths.js";
import { writeEntity } from "../core/fs.js";
import { nextId } from "./next-id.js";

export interface ReportCreateInput {
  readonly title: string;
  readonly type: ReportType;
  readonly severity: Severity;
  readonly body: string;
}

export async function reportCreate(
  cwd: string,
  input: ReportCreateInput,
): Promise<{ id: string; path: string }> {
  const id = await nextId(cwd, "report");
  const slug = titleToSlug(input.title);
  const filename = `${id}-${slug}.md`;
  const dir = reportDir(cwd, "pending");
  const filePath = join(dir, filename);

  const frontmatter: Record<string, unknown> = {
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
