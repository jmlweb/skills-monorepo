import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskCreate } from "./task-create.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskCreate", () => {
  it("creates a task file in pending/", async () => {
    const result = await taskCreate(tmp, {
      title: "Fix authentication bug",
      priority: "P2",
      tags: ["api", "auth"],
      description: "The auth flow fails when tokens expire.",
      criteria: ["Token refresh works", "Error message shown"],
      source: "manual",
      dependsOn: [],
    });

    expect(result.id).toBe("TSK-001");
    expect(result.path).toContain("TSK-001-fix-authentication-bug.md");

    const content = await readFile(result.path, "utf-8");
    expect(content).toContain("id: TSK-001");
    expect(content).toContain("title: Fix authentication bug");
    expect(content).toContain("priority: P2");
    expect(content).toContain("tags: [api, auth]");
    expect(content).toContain("source: manual");
    expect(content).toContain("- [ ] Token refresh works");
    expect(content).toContain("- [ ] Error message shown");
    expect(content).toContain("The auth flow fails when tokens expire.");
  });

  it("increments ID for subsequent tasks", async () => {
    await taskCreate(tmp, {
      title: "First task",
      priority: "P3",
      tags: [],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const result = await taskCreate(tmp, {
      title: "Second task",
      priority: "P1",
      tags: ["urgent"],
      description: "Desc 2",
      criteria: ["Done"],
      source: "manual",
      dependsOn: [],
    });

    expect(result.id).toBe("TSK-002");
  });

  it("updates the task index", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: ["api"],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const index = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| TSK-001 | Fix bug | P2 |");
    expect(index).toContain("| Pending | 1 |");
  });

  it("handles plan source", async () => {
    const result = await taskCreate(tmp, {
      title: "From plan",
      priority: "P2",
      tags: [],
      description: "Created from plan",
      criteria: [],
      source: "plan/PLN-001",
      dependsOn: [],
    });

    const content = await readFile(result.path, "utf-8");
    expect(content).toContain("source: plan/PLN-001");
  });
});
