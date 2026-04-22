import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskUpdate } from "./task-update.js";
import { taskCreate } from "./task-create.js";
import { setup } from "./setup.js";
import { readEntity } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
  await taskCreate(tmp, {
    title: "Fix bug",
    priority: "P2",
    tags: [],
    description: "Desc",
    criteria: [],
    source: "manual",
    dependsOn: [],
  });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskUpdate", () => {
  it("updates frontmatter fields", async () => {
    const result = await taskUpdate(tmp, "TSK-001", {
      priority: "P1",
    });

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["priority"]).toBe("P1");
  });

  it("adds a progress log entry", async () => {
    const result = await taskUpdate(
      tmp,
      "TSK-001",
      { priority: "P1" },
      "Escalated priority",
    );

    const doc = await readEntity(result.path);
    expect(doc.body).toContain("Escalated priority");
  });

  it("rejects status as a key", async () => {
    await expect(
      taskUpdate(tmp, "TSK-001", { status: "blocked" }),
    ).rejects.toThrow(/Cannot set "status" via task-update/);
  });

  it("rejects blocked-by as a key", async () => {
    await expect(
      taskUpdate(tmp, "TSK-001", { "blocked-by": "waiting for API" }),
    ).rejects.toThrow(/Cannot set "blocked-by" via task-update/);
  });

  it("throws for non-existent task", async () => {
    await expect(
      taskUpdate(tmp, "TSK-999", { priority: "P1" }),
    ).rejects.toThrow("not found");
  });
});
