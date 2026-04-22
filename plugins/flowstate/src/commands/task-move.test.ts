import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskMove } from "./task-move.js";
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

describe("taskMove", () => {
  it("moves task from pending to active", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: ["api"],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const result = await taskMove(tmp, "TSK-001", "active");
    expect(result.path).toContain("tasks/active/TSK-001");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("active");
    expect(fm["started"]).toBeTruthy();
    expect(doc.body).toContain("Started");
  });

  it("moves task from active to complete", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskMove(tmp, "TSK-001", "active");
    const result = await taskMove(tmp, "TSK-001", "complete");

    expect(result.path).toContain("tasks/complete/TSK-001");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("complete");
    expect(fm["completed"]).toBeTruthy();
  });

  it("updates task index stats", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskMove(tmp, "TSK-001", "active");

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| Pending | 0 |");
    expect(index).toContain("| Active | 1 |");
  });

  it("adds to Recently Completed on complete", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| TSK-001 | Fix bug |");
    expect(index).toContain("| Complete | 1 |");
  });

  it("throws for non-existent task", async () => {
    await expect(taskMove(tmp, "TSK-999", "active")).rejects.toThrow(
      "not found",
    );
  });

  it("keeps correct index counts after completing multiple tasks in rapid succession", async () => {
    for (let i = 0; i < 3; i++) {
      await taskCreate(tmp, {
        title: `Task ${i + 1}`,
        priority: "P3",
        tags: [],
        description: "",
        criteria: [],
        source: "manual",
        dependsOn: [],
      });
    }
    // Move all to active
    await Promise.all([
      taskMove(tmp, "TSK-001", "active"),
      taskMove(tmp, "TSK-002", "active"),
      taskMove(tmp, "TSK-003", "active"),
    ]);
    // Complete all in rapid succession (simulates back-to-back CLI invocations)
    await Promise.all([
      taskMove(tmp, "TSK-001", "complete"),
      taskMove(tmp, "TSK-002", "complete"),
      taskMove(tmp, "TSK-003", "complete"),
    ]);

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| Active | 0 |");
    expect(index).toContain("| Complete | 3 |");
    expect(index).toContain("| Pending | 0 |");
  });
});
