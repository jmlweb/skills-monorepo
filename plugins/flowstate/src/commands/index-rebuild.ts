import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { taskDir, taskIndexPath, learningsIndexPath, learningsDir } from "../core/paths.js";
import { listFiles, readEntity } from "../core/fs.js";
import { updateStatsTable, replaceSection } from "../core/markdown.js";
import { readdir } from "node:fs/promises";

export async function indexRebuild(
  cwd: string,
  type: "tasks" | "learnings" | "all" = "all",
): Promise<void> {
  if (type === "tasks" || type === "all") {
    await rebuildTaskIndex(cwd);
  }
  if (type === "learnings" || type === "all") {
    await rebuildLearningsIndex(cwd);
  }
}

interface TaskInfo {
  id: string;
  title: string;
  priority: string;
  tags: string[];
  created: string;
  completed: string | undefined;
  status: string;
  blockedBy: string | undefined;
}

async function readTasksFromDir(
  dir: string,
): Promise<TaskInfo[]> {
  const files = await listFiles(dir);
  const tasks: TaskInfo[] = [];

  for (const file of files) {
    if (file.name === "index.md") continue;
    const doc = await readEntity(join(dir, file.name));
    const fm = doc.frontmatter as Record<string, unknown>;
    tasks.push({
      id: String(fm["id"] ?? ""),
      title: String(fm["title"] ?? ""),
      priority: String(fm["priority"] ?? ""),
      tags: Array.isArray(fm["tags"]) ? fm["tags"] as string[] : [],
      created: String(fm["created"] ?? ""),
      completed: fm["completed"] ? String(fm["completed"]) : undefined,
      status: String(fm["status"] ?? ""),
      blockedBy: fm["blocked-by"] ? String(fm["blocked-by"]) : undefined,
    });
  }

  return tasks;
}

async function rebuildTaskIndex(cwd: string): Promise<void> {
  const indexPath = taskIndexPath(cwd);
  let content = await readFile(indexPath, "utf-8");

  const pending = await readTasksFromDir(taskDir(cwd, "pending"));
  const active = await readTasksFromDir(taskDir(cwd, "active"));
  const complete = await readTasksFromDir(taskDir(cwd, "complete"));

  const blockedCount = active.filter((t) => t.blockedBy).length;
  const activeCount = active.length - blockedCount;

  // Update stats
  content = updateStatsTable(content, {
    Pending: pending.length,
    Active: activeCount,
    Blocked: blockedCount,
    Complete: complete.length,
  });

  // Rebuild Active Tasks section
  const activeLines =
    active.length > 0
      ? active
          .map((t) => {
            const suffix = t.blockedBy ? ` [BLOCKED: ${t.blockedBy}]` : "";
            return `- ${t.id}: ${t.title} (${t.priority})${suffix}`;
          })
          .join("\n")
      : "_No active tasks._";
  content = replaceSection(content, "Active Tasks", activeLines);

  // Rebuild Pending Tasks table
  const pendingHeader = `| ID | Title | Priority | Tags | Created |\n|----|-------|----------|------|---------|`;
  const pendingRows = pending
    .map((t) => `| ${t.id} | ${t.title} | ${t.priority} | ${t.tags.join(", ")} | ${t.created} |`)
    .join("\n");
  const pendingContent = pendingRows
    ? `${pendingHeader}\n${pendingRows}`
    : pendingHeader;
  content = replaceSection(content, "Pending Tasks", pendingContent);

  // Rebuild Recently Completed table
  const completeHeader = `| ID | Title | Completed |\n|----|-------|-----------|\n`;
  const recentComplete = complete
    .sort((a, b) => (b.completed ?? "").localeCompare(a.completed ?? ""))
    .slice(0, 10);
  const completeRows = recentComplete
    .map((t) => `| ${t.id} | ${t.title} | ${t.completed ?? "" } |`)
    .join("\n");
  const completeContent = completeRows
    ? `${completeHeader}${completeRows}`
    : completeHeader;
  content = replaceSection(content, "Recently Completed", completeContent);

  await writeFile(indexPath, content, "utf-8");
}

async function rebuildLearningsIndex(cwd: string): Promise<void> {
  const indexPath = learningsIndexPath(cwd);
  let content = await readFile(indexPath, "utf-8");

  const lDir = learningsDir(cwd);
  let entries: string[];
  try {
    entries = await readdir(lDir).then((e) =>
      e.filter((name) => name.startsWith("LRN-")),
    );
  } catch {
    return;
  }

  // Clear existing table rows and rebuild
  const lines = content.split("\n");
  const tableStart = lines.findIndex(
    (l) => l.startsWith("| ID") || l.startsWith("|--"),
  );

  if (tableStart === -1) return;

  // Find the separator line
  const separatorIndex = lines.findIndex((l, i) => i >= tableStart && l.startsWith("|--"));
  if (separatorIndex === -1) return;

  // Keep everything up to and including separator
  const header = lines.slice(0, separatorIndex + 1);

  // Find where existing table rows end (first non-pipe line after separator)
  let tableEnd = separatorIndex + 1;
  while (tableEnd < lines.length && lines[tableEnd]!.startsWith("|")) {
    tableEnd++;
  }

  // Preserve any content after the table
  const trailing = lines.slice(tableEnd);

  const rows: string[] = [];

  for (const entry of entries.sort()) {
    const indexFile = join(lDir, entry, "index.md");
    try {
      const doc = await readEntity(indexFile);
      const fm = doc.frontmatter as Record<string, unknown>;
      const tags = Array.isArray(fm["tags"]) ? (fm["tags"] as string[]).join(", ") : "";
      const status = fm["status"] ? String(fm["status"]) : "active";
      rows.push(
        `| ${fm["id"]} | ${fm["title"]} | ${tags} | ${status} | ${fm["created"]} |`,
      );
    } catch {
      // Skip invalid entries
    }
  }

  content = [...header, ...rows, ...trailing].join("\n");
  await writeFile(indexPath, content, "utf-8");
}
