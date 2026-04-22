import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stats } from "./stats.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { taskBlock } from "./task-block.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("stats", () => {
  it("returns zeros for empty backlog", async () => {
    const result = await stats(tmp);
    expect(result).toEqual({ pending: 0, active: 0, blocked: 0, complete: 0, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
  });

  it("counts tasks by status", async () => {
    await taskCreate(tmp, { title: "A", priority: "P2", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskCreate(tmp, { title: "B", priority: "P2", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskCreate(tmp, { title: "C", priority: "P1", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskMove(tmp, "TSK-002", "active");
    await taskMove(tmp, "TSK-003", "active");
    await taskMove(tmp, "TSK-003", "complete");

    const result = await stats(tmp);
    expect(result).toEqual({ pending: 1, active: 1, blocked: 0, complete: 1, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
  });

  it("counts blocked tasks separately", async () => {
    await taskCreate(tmp, { title: "A", priority: "P2", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });
    await taskMove(tmp, "TSK-001", "active");
    await taskBlock(tmp, "TSK-001", "waiting");

    const result = await stats(tmp);
    expect(result).toEqual({ pending: 0, active: 0, blocked: 1, complete: 0, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
  });
});
