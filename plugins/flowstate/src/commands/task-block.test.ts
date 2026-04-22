import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskBlock } from "./task-block.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
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

describe("taskBlock", () => {
  it("sets status to blocked and adds blocked-by", async () => {
    const result = await taskBlock(tmp, "TSK-001", "waiting for API");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("blocked");
    expect(fm["blocked-by"]).toBe("waiting for API");
  });

  it("adds a progress log entry", async () => {
    const result = await taskBlock(tmp, "TSK-001", "waiting for API");

    const doc = await readEntity(result.path);
    expect(doc.body).toContain("Blocked: waiting for API");
  });

  it("works on active tasks", async () => {
    await taskMove(tmp, "TSK-001", "active");
    const result = await taskBlock(tmp, "TSK-001", "dependency missing");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("blocked");
    expect(fm["blocked-by"]).toBe("dependency missing");
  });

  it("throws for non-existent task", async () => {
    await expect(
      taskBlock(tmp, "TSK-999", "reason"),
    ).rejects.toThrow("not found");
  });
});
