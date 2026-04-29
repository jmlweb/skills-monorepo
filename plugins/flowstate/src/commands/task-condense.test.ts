import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskCondense, taskCondenseAll } from "./task-condense.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { taskUpdate } from "./task-update.js";
import { setup } from "./setup.js";
import { readEntity, writeEntity } from "../core/fs.js";
import { replaceSection } from "../core/markdown.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function createCompleteTask(id: string, title: string): Promise<string> {
  await taskCreate(tmp, {
    title,
    priority: "P2",
    tags: [],
    description: "Desc",
    criteria: [],
    source: "manual",
    dependsOn: [],
  });
  await taskMove(tmp, id, "active");
  await taskMove(tmp, id, "complete");
  return join(tmp, ".backlog", "tasks", "complete");
}

describe("taskCondense", () => {
  it("trims Notes content from a complete task", async () => {
    await createCompleteTask("TSK-001", "Fix");
    // Inject Notes content
    const filePath = join(tmp, ".backlog", "tasks", "complete", "TSK-001-fix.md");
    const doc = await readEntity(filePath);
    const body = replaceSection(doc.body, "Notes", "Some scratchpad notes\nMore intermediate thoughts");
    await writeEntity(filePath, doc.frontmatter as Record<string, unknown>, body);

    const result = await taskCondense(tmp, "TSK-001");
    expect(result.condensed).toBe(true);
    expect(result.bytesAfter).toBeLessThan(result.bytesBefore);

    const after = await readEntity(filePath);
    expect(after.body).not.toContain("scratchpad notes");
    expect(after.body).toContain("## Notes");
    const condensed = (after.frontmatter as Record<string, unknown>)["condensed"];
    expect(condensed === true || condensed === "true").toBe(true);
  });

  it("trims middle Progress Log entries, keeping first and last", async () => {
    await createCompleteTask("TSK-001", "Fix");
    const filePath = join(tmp, ".backlog", "tasks", "complete", "TSK-001-fix.md");

    // Inject middle progress log entries
    await taskUpdate(tmp, "TSK-001", {}, "Working on it");
    await taskUpdate(tmp, "TSK-001", {}, "Hit a snag");
    await taskUpdate(tmp, "TSK-001", {}, "Fixed snag");

    const before = await readEntity(filePath);
    expect(before.body).toContain("Working on it");
    expect(before.body).toContain("Hit a snag");

    const result = await taskCondense(tmp, "TSK-001");
    expect(result.condensed).toBe(true);

    const after = await readEntity(filePath);
    expect(after.body).toContain("Created");
    expect(after.body).toContain("Condensed");
    expect(after.body).toContain("Fixed snag");
    expect(after.body).not.toContain("Working on it");
    expect(after.body).not.toContain("Hit a snag");
  });

  it("skips already-lean tasks", async () => {
    await createCompleteTask("TSK-001", "Fix");

    const result = await taskCondense(tmp, "TSK-001");
    expect(result.condensed).toBe(false);
    expect(result.skippedReason).toBe("already lean");
  });

  it("is idempotent (skips if condensed: true)", async () => {
    await createCompleteTask("TSK-001", "Fix");
    const filePath = join(tmp, ".backlog", "tasks", "complete", "TSK-001-fix.md");
    const doc = await readEntity(filePath);
    const body = replaceSection(doc.body, "Notes", "stuff to drop");
    await writeEntity(filePath, doc.frontmatter as Record<string, unknown>, body);

    const first = await taskCondense(tmp, "TSK-001");
    expect(first.condensed).toBe(true);

    const second = await taskCondense(tmp, "TSK-001");
    expect(second.condensed).toBe(false);
    expect(second.skippedReason).toBe("already condensed");
  });

  it("rejects non-complete tasks", async () => {
    await taskCreate(tmp, {
      title: "Pending one",
      priority: "P3",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await expect(taskCondense(tmp, "TSK-001")).rejects.toThrow("not found");
  });

  it("throws for non-existent task", async () => {
    await expect(taskCondense(tmp, "TSK-999")).rejects.toThrow("not found");
  });
});

describe("taskCondenseAll", () => {
  it("condenses every complete task with content to drop", async () => {
    await createCompleteTask("TSK-001", "First");
    await createCompleteTask("TSK-002", "Second");

    // Inject Notes into TSK-001 only
    const path1 = join(tmp, ".backlog", "tasks", "complete", "TSK-001-first.md");
    const doc1 = await readEntity(path1);
    const body1 = replaceSection(doc1.body, "Notes", "noise");
    await writeEntity(path1, doc1.frontmatter as Record<string, unknown>, body1);

    const results = await taskCondenseAll(tmp);
    expect(results).toHaveLength(2);
    const condensed = results.filter((r) => r.condensed);
    expect(condensed).toHaveLength(1);
    expect(condensed[0]!.id).toBe("TSK-001");
  });

  it("returns empty array when no complete tasks", async () => {
    const results = await taskCondenseAll(tmp);
    expect(results).toEqual([]);
  });
});
