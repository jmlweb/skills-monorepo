import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { indexRebuild } from "./index-rebuild.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { learningCreate } from "./learning-create.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("indexRebuild", () => {
  it("rebuilds task index from disk state", async () => {
    await taskCreate(tmp, { title: "A", priority: "P1", tags: ["api"], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskCreate(tmp, { title: "B", priority: "P2", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskMove(tmp, "TSK-001", "active");

    await indexRebuild(tmp, "tasks");

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| Pending | 1 |");
    expect(index).toContain("| Active | 1 |");
    expect(index).toContain("| TSK-002 | B | P2 |");
  });

  it("handles empty backlog", async () => {
    await indexRebuild(tmp, "tasks");

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| Pending | 0 |");
    expect(index).toContain("| Active | 0 |");
  });

  it("preserves content after learnings table on rebuild", async () => {
    await learningCreate(tmp, {
      title: "Test insight",
      tags: ["testing"],
      body: "Content",
    });

    // Append content after the table
    const indexPath = join(tmp, ".backlog", "learnings", "index.md");
    const original = await readFile(indexPath, "utf-8");
    const withTrailing = original + "\n> Consult a learning's full document for details.\n";
    await writeFile(indexPath, withTrailing, "utf-8");

    await indexRebuild(tmp, "learnings");

    const rebuilt = await readFile(indexPath, "utf-8");
    expect(rebuilt).toContain("| LRN-001 | Test insight |");
    expect(rebuilt).toContain("> Consult a learning's full document for details.");
  });
});
