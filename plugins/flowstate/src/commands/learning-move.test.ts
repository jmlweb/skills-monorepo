import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningMove } from "./learning-move.js";
import { learningCreate } from "./learning-create.js";
import { learningSearch } from "./learning-search.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("learningMove", () => {
  it("archives a learning by ID", async () => {
    await learningCreate(tmp, { title: "Test learning", tags: ["testing"], body: "Some content." });

    const result = await learningMove(tmp, "LRN-001", "archived");
    expect(result.id).toBe("LRN-001");
    expect(result.status).toBe("archived");
  });

  it("archived learning no longer appears in search", async () => {
    await learningCreate(tmp, { title: "Test learning", tags: ["testing"], body: "Some content." });
    await learningMove(tmp, "LRN-001", "archived");

    const found = await learningSearch(tmp, { tags: ["testing"] });
    expect(found).toHaveLength(0);
  });

  it("accepts bare number as ID", async () => {
    await learningCreate(tmp, { title: "Test learning", tags: [], body: "Content." });

    const result = await learningMove(tmp, "1", "archived");
    expect(result.id).toBe("LRN-001");
    expect(result.status).toBe("archived");
  });

  it("throws EntityNotFoundError for unknown ID", async () => {
    await expect(learningMove(tmp, "LRN-099", "archived")).rejects.toThrow("LRN-099");
  });
});
