import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningCompress } from "./learning-compress.js";
import { learningCreate } from "./learning-create.js";
import { setup } from "./setup.js";
import { readEntity, writeEntity } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const ORIG_BODY = [
  "## Insight",
  "",
  "We learned that we really should always make sure to handle TSK-100 with care on 2026-04-29.",
  "",
  "## Context",
  "",
  "See https://example.com/post and run `npm test` regularly.",
].join("\n");

async function createLearningWithBody(body: string): Promise<{ id: string; filePath: string }> {
  const created = await learningCreate(tmp, {
    title: "Test learning",
    tags: ["t1"],
    body: "placeholder",
  });
  const doc = await readEntity(created.path);
  await writeEntity(created.path, doc.frontmatter as Record<string, unknown>, body);
  return { id: created.id, filePath: created.path };
}

describe("learningCompress", () => {
  it("writes valid compressed body and sets compressed:true", async () => {
    const { id, filePath } = await createLearningWithBody(ORIG_BODY);

    const compressed = [
      "## Insight",
      "",
      "Handle TSK-100 carefully on 2026-04-29.",
      "",
      "## Context",
      "",
      "See https://example.com/post, run `npm test`.",
    ].join("\n");

    const result = await learningCompress(tmp, id, compressed);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.bytesAfter).toBeLessThan(result.bytesBefore);

    const after = await readEntity(filePath);
    expect(after.body).toBe(compressed);
    const fm = after.frontmatter as Record<string, unknown>;
    expect(fm["compressed"] === true || fm["compressed"] === "true").toBe(true);
  });

  it("rejects when ID is missing", async () => {
    const { id, filePath } = await createLearningWithBody(ORIG_BODY);
    const broken = ORIG_BODY.replace("TSK-100", "the task").slice(0, -10);
    const result = await learningCompress(tmp, id, broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing ID"))).toBe(true);

    const after = await readEntity(filePath);
    expect(after.body).toBe(ORIG_BODY);
  });

  it("skips when already compressed", async () => {
    const { id, filePath } = await createLearningWithBody(ORIG_BODY);
    const doc = await readEntity(filePath);
    const fm = { ...(doc.frontmatter as Record<string, unknown>), compressed: true };
    await writeEntity(filePath, fm, doc.body);

    const result = await learningCompress(tmp, id, "anything");
    expect(result.skippedReason).toBe("already compressed");
  });
});
