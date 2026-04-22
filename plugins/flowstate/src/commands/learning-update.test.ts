import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningUpdate } from "./learning-update.js";
import { learningCreate } from "./learning-create.js";
import { learningList } from "./learning-list.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("learningUpdate", () => {
  it("updates the title", async () => {
    await learningCreate(tmp, { title: "Old title", tags: [], body: "Content." });
    await learningUpdate(tmp, "LRN-001", { title: "New title" });

    const results = await learningList(tmp);
    expect(results[0]!.title).toBe("New title");
  });

  it("updates tags", async () => {
    await learningCreate(tmp, { title: "Learning", tags: ["old-tag"], body: "Content." });
    await learningUpdate(tmp, "LRN-001", { tags: ["new-tag", "another-tag"] });

    const results = await learningList(tmp);
    expect(results[0]!.tags).toEqual(["new-tag", "another-tag"]);
  });

  it("updates body", async () => {
    await learningCreate(tmp, { title: "Learning", tags: [], body: "Old content." });
    await learningUpdate(tmp, "LRN-001", { body: "New content with more detail." });

    const results = await learningList(tmp);
    expect(results[0]!.body).toBe("New content with more detail.");
  });

  it("preserves unchanged fields when partially updating", async () => {
    await learningCreate(tmp, { title: "Original", tags: ["keep-tag"], body: "Keep this body." });
    await learningUpdate(tmp, "LRN-001", { title: "Updated title" });

    const results = await learningList(tmp);
    expect(results[0]!.title).toBe("Updated title");
    expect(results[0]!.tags).toEqual(["keep-tag"]);
    expect(results[0]!.body).toBe("Keep this body.");
  });

  it("accepts bare number as ID", async () => {
    await learningCreate(tmp, { title: "Learning", tags: [], body: "Content." });
    const result = await learningUpdate(tmp, "1", { title: "Updated" });
    expect(result.id).toBe("LRN-001");
  });

  it("throws EntityNotFoundError for unknown ID", async () => {
    await expect(learningUpdate(tmp, "LRN-099", { title: "x" })).rejects.toThrow("LRN-099");
  });
});
