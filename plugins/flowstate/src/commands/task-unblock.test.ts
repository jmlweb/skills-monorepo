import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskUnblock } from "./task-unblock.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { taskBlock } from "./task-block.js";
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

describe("taskUnblock", () => {
  it("restores active status for started task", async () => {
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
    await taskBlock(tmp, "TSK-001", "waiting");

    const result = await taskUnblock(tmp, "TSK-001", "API ready");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("active");
    expect(fm["blocked-by"]).toBeUndefined();
    expect(doc.body).toContain("Unblocked: API ready");
  });

  it("restores pending status for unstarted task", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskBlock(tmp, "TSK-001", "waiting");

    const result = await taskUnblock(tmp, "TSK-001");

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("pending");
  });
});
