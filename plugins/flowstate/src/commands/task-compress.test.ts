import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskCompress } from "./task-compress.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
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

async function makeCompleteTaskWithBody(id: string, body: string): Promise<string> {
  await taskCreate(tmp, {
    title: "Fix",
    priority: "P2",
    tags: [],
    description: "Desc",
    criteria: ["Crit one", "Crit two"],
    source: "manual",
    dependsOn: [],
  });
  await taskMove(tmp, id, "active");
  await taskMove(tmp, id, "complete");
  const filePath = join(tmp, ".backlog", "tasks", "complete", `${id}-fix.md`);
  const doc = await readEntity(filePath);
  await writeEntity(filePath, doc.frontmatter as Record<string, unknown>, body);
  return filePath;
}

const ORIG_BODY = [
  "## Description",
  "",
  "We absolutely need to make sure that we really fix the bug in TSK-042 by 2026-04-29.",
  "",
  "## Acceptance Criteria",
  "",
  "- Crit one",
  "- Crit two",
  "",
  "## Notes",
  "",
  "See https://example.com/docs and run `npm test`.",
].join("\n");

describe("taskCompress", () => {
  it("writes valid compressed body and sets compressed:true", async () => {
    const filePath = await makeCompleteTaskWithBody("TSK-001", ORIG_BODY);

    const compressed = [
      "## Description",
      "",
      "Fix bug in TSK-042 by 2026-04-29.",
      "",
      "## Acceptance Criteria",
      "",
      "- Crit one",
      "- Crit two",
      "",
      "## Notes",
      "",
      "See https://example.com/docs, run `npm test`.",
    ].join("\n");

    const result = await taskCompress(tmp, "TSK-001", compressed);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.bytesAfter).toBeLessThan(result.bytesBefore);

    const after = await readEntity(filePath);
    expect(after.body).toBe(compressed);
    const fm = after.frontmatter as Record<string, unknown>;
    expect(fm["compressed"] === true || fm["compressed"] === "true").toBe(true);
  });

  it("rejects when Acceptance Criteria modified", async () => {
    const filePath = await makeCompleteTaskWithBody("TSK-001", ORIG_BODY);
    const broken = ORIG_BODY.replace("- Crit one", "- Crit uno").slice(0, -10);

    const result = await taskCompress(tmp, "TSK-001", broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Acceptance Criteria"))).toBe(true);

    const after = await readEntity(filePath);
    expect(after.body).toBe(ORIG_BODY);
    expect((after.frontmatter as Record<string, unknown>)["compressed"]).toBeUndefined();
  });

  it("rejects when ID is missing in compressed body", async () => {
    await makeCompleteTaskWithBody("TSK-001", ORIG_BODY);
    const broken = ORIG_BODY.replace("TSK-042", "the bug").slice(0, -5);
    const result = await taskCompress(tmp, "TSK-001", broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing ID"))).toBe(true);
  });

  it("skips when already compressed", async () => {
    const filePath = await makeCompleteTaskWithBody("TSK-001", ORIG_BODY);
    const doc = await readEntity(filePath);
    const fm = { ...(doc.frontmatter as Record<string, unknown>), compressed: true };
    await writeEntity(filePath, fm, doc.body);

    const result = await taskCompress(tmp, "TSK-001", "anything");
    expect(result.ok).toBe(false);
    expect(result.skippedReason).toBe("already compressed");
  });
});
