import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningList } from "./learning-list.js";
import { learningCreate } from "./learning-create.js";
import { learningMove } from "./learning-move.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("learningList", () => {
  it("returns empty when no learnings exist", async () => {
    const results = await learningList(tmp);
    expect(results).toEqual([]);
  });

  it("lists active learnings by default", async () => {
    await learningCreate(tmp, { title: "Learning A", tags: ["a"], body: "Body A" });
    await learningCreate(tmp, { title: "Learning B", tags: ["b"], body: "Body B" });

    const results = await learningList(tmp);
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe("LRN-001");
    expect(results[1]!.id).toBe("LRN-002");
  });

  it("includes body in results", async () => {
    await learningCreate(tmp, { title: "Learning A", tags: [], body: "Important insight here." });

    const results = await learningList(tmp);
    expect(results[0]!.body).toBe("Important insight here.");
  });

  it("excludes archived learnings by default", async () => {
    await learningCreate(tmp, { title: "Keep", tags: [], body: "Still relevant." });
    await learningCreate(tmp, { title: "Stale", tags: [], body: "Old info." });
    await learningMove(tmp, "LRN-002", "archived");

    const results = await learningList(tmp);
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("LRN-001");
  });

  it("includes archived learnings with --all", async () => {
    await learningCreate(tmp, { title: "Keep", tags: [], body: "Still relevant." });
    await learningCreate(tmp, { title: "Stale", tags: [], body: "Old info." });
    await learningMove(tmp, "LRN-002", "archived");

    const results = await learningList(tmp, { all: true });
    expect(results).toHaveLength(2);
  });

  it("returns results sorted by ID", async () => {
    await learningCreate(tmp, { title: "B", tags: [], body: "b" });
    await learningCreate(tmp, { title: "A", tags: [], body: "a" });

    const results = await learningList(tmp);
    expect(results[0]!.id).toBe("LRN-001");
    expect(results[1]!.id).toBe("LRN-002");
  });
});
