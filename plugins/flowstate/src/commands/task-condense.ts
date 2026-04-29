import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity, listFiles } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError, InvalidArgumentError } from "../core/errors.js";
import { replaceSection, hasSection, appendToSection, appendToBody } from "../core/markdown.js";

export interface TaskCondenseResult {
  readonly id: string;
  readonly path: string;
  readonly condensed: boolean;
  readonly bytesBefore: number;
  readonly bytesAfter: number;
  readonly skippedReason?: string;
}

const MIN_PROGRESS_LOG_ENTRIES_TO_TRIM = 4;
const MIN_NOTES_CONTENT_LENGTH = 1;

export async function taskCondense(
  cwd: string,
  id: string,
): Promise<TaskCondenseResult> {
  const dir = taskDir(cwd, "complete");
  const fileName = await findEntityFile(dir, id);
  if (!fileName) {
    throw new EntityNotFoundError(id, "tasks/complete");
  }
  const filePath = join(dir, fileName);
  return condenseFile(filePath, id);
}

export async function taskCondenseAll(
  cwd: string,
): Promise<TaskCondenseResult[]> {
  const dir = taskDir(cwd, "complete");
  const files = await listFiles(dir);
  const results: TaskCondenseResult[] = [];
  for (const file of files) {
    if (file.name === "index.md") continue;
    const filePath = join(dir, file.name);
    const doc = await readEntity(filePath);
    const fm = doc.frontmatter as Record<string, unknown>;
    const id = String(fm["id"] ?? "");
    if (!id) continue;
    results.push(await condenseFile(filePath, id));
  }
  return results;
}

async function condenseFile(
  filePath: string,
  id: string,
): Promise<TaskCondenseResult> {
  const doc = await readEntity(filePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };

  if (fm["status"] !== "complete") {
    throw new InvalidArgumentError(
      `Task ${id} is not complete (status: ${String(fm["status"])}). Only complete tasks can be condensed.`,
    );
  }

  const bytesBefore = Buffer.byteLength(doc.body, "utf-8");

  if (fm["condensed"] === true || fm["condensed"] === "true") {
    return {
      id,
      path: filePath,
      condensed: false,
      bytesBefore,
      bytesAfter: bytesBefore,
      skippedReason: "already condensed",
    };
  }

  let body = doc.body;
  let changed = false;

  if (hasSection(body, "Notes")) {
    const notesContent = extractSection(body, "Notes");
    if (notesContent.trim().length >= MIN_NOTES_CONTENT_LENGTH) {
      body = replaceSection(body, "Notes", "");
      changed = true;
    }
  }

  if (hasSection(body, "Progress Log")) {
    const log = extractSection(body, "Progress Log");
    const entries = log.split("\n").filter((l) => l.trim().startsWith("- "));
    if (entries.length >= MIN_PROGRESS_LOG_ENTRIES_TO_TRIM) {
      const first = entries[0]!;
      const last = entries[entries.length - 1]!;
      const trimmed = [first, last].join("\n");
      body = replaceSection(body, "Progress Log", trimmed);
      changed = true;
    }
  }

  if (!changed) {
    return {
      id,
      path: filePath,
      condensed: false,
      bytesBefore,
      bytesAfter: bytesBefore,
      skippedReason: "already lean",
    };
  }

  if (hasSection(body, "Progress Log")) {
    body = appendToSection(body, "Progress Log", `- [${today()}] Condensed`);
  } else {
    body = appendToBody(body, `- [${today()}] Condensed`);
  }
  fm["condensed"] = true;

  await writeEntity(filePath, fm, body);

  const after = await readEntity(filePath);
  const bytesAfter = Buffer.byteLength(after.body, "utf-8");

  return { id, path: filePath, condensed: true, bytesBefore, bytesAfter };
}

function extractSection(content: string, heading: string): string {
  const lines = content.split("\n");
  const headingPattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i]!)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
