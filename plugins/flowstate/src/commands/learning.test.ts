import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningCreate } from "./learning-create.js";
import { taskCreate } from "./task-create.js";
import { setup } from "./setup.js";
import { readEntity } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("learningCreate", () => {
  it("creates a learning directory with index.md", async () => {
    const result = await learningCreate(tmp, {
      title: "Mocking considered harmful",
      tags: ["testing", "mocking"],
      body: "# Mocking considered harmful\n\n## Context\n\nWe mocked too much.",
    });

    expect(result.id).toBe("LRN-001");
    expect(result.path).toContain("LRN-001-mocking-considered-harmful/index.md");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["tags"]).toEqual(["testing", "mocking"]);
  });

  it("updates learnings index", async () => {
    await learningCreate(tmp, {
      title: "Always test edge cases",
      tags: ["testing"],
      body: "Content",
    });

    const index = await readFile(
      join(tmp, ".backlog", "learnings", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| LRN-001 | Always test edge cases |");
  });

  it("does not fail when the target task has no Learnings section", async () => {
    await taskCreate(tmp, {
      title: "Legacy task",
      priority: "P2",
      tags: [],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    // Strip the Learnings section to simulate a legacy/manual task
    const { writeFile } = await import("node:fs/promises");
    const taskFile = join(
      tmp,
      ".backlog",
      "tasks",
      "pending",
      "TSK-001-legacy-task.md",
    );
    const original = await readFile(taskFile, "utf-8");
    const stripped = original.replace(/\n## Learnings\n/, "\n");
    await writeFile(taskFile, stripped, "utf-8");

    await expect(
      learningCreate(tmp, {
        title: "Still works",
        tags: [],
        body: "Content",
        task: "TSK-001",
      }),
    ).resolves.toMatchObject({ id: "LRN-001" });

    const after = await readFile(taskFile, "utf-8");
    expect(after).toBe(stripped);
  });

  it("appends link to task when task specified", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: [],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    await learningCreate(tmp, {
      title: "Learned something",
      tags: [],
      body: "Content",
      task: "TSK-001",
    });

    const taskFile = join(
      tmp,
      ".backlog",
      "tasks",
      "pending",
      "TSK-001-fix-bug.md",
    );
    const content = await readFile(taskFile, "utf-8");
    expect(content).toContain("LRN-001: Learned something");
  });
});
