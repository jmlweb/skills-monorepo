import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskDoctor } from "./task-doctor.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { taskBlock } from "./task-block.js";
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

async function createTask(title: string): Promise<void> {
  await taskCreate(tmp, {
    title,
    priority: "P2",
    tags: [],
    description: "Desc",
    criteria: [],
    source: "manual",
    dependsOn: [],
  });
}

async function injectStatus(
  folder: "pending" | "active" | "complete",
  fileName: string,
  status: string,
): Promise<string> {
  const path = join(tmp, ".backlog", "tasks", folder, fileName);
  const doc = await readEntity(path);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };
  fm["status"] = status;
  await writeEntity(path, fm, doc.body);
  return path;
}

describe("taskDoctor", () => {
  it("returns clean result when all tasks are consistent", async () => {
    await createTask("Pending one");
    await createTask("Active one");
    await taskMove(tmp, "TSK-002", "active");

    const result = await taskDoctor(tmp);
    expect(result.scanned).toBe(2);
    expect(result.fixed).toEqual([]);
  });

  it("fixes a complete task whose frontmatter says pending", async () => {
    await createTask("Drifted");
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");
    await injectStatus("complete", "TSK-001-drifted.md", "pending");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]!.id).toBe("TSK-001");
    expect(result.fixed[0]!.statusBefore).toBe("pending");
    expect(result.fixed[0]!.statusAfter).toBe("complete");

    const doc = await readEntity(result.fixed[0]!.path);
    expect((doc.frontmatter as Record<string, unknown>)["status"]).toBe("complete");
  });

  it("maps synonyms to canonical (done -> complete)", async () => {
    await createTask("Synonym");
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");
    await injectStatus("complete", "TSK-001-synonym.md", "done");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]!.statusAfter).toBe("complete");
  });

  it("maps wip -> active in active/ folder", async () => {
    await createTask("Working");
    await taskMove(tmp, "TSK-001", "active");
    await injectStatus("active", "TSK-001-working.md", "wip");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]!.statusAfter).toBe("active");
  });

  it("preserves blocked status when blocked-by is set", async () => {
    await createTask("Blocked");
    await taskMove(tmp, "TSK-001", "active");
    await taskBlock(tmp, "TSK-001", "waiting on api");
    // Now manually drift: set status to "active" while blocked-by is present.
    await injectStatus("active", "TSK-001-blocked.md", "active");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]!.statusAfter).toBe("blocked");
  });

  it("ignores synonyms inconsistent with folder (complete in pending/)", async () => {
    await createTask("Lying");
    await injectStatus("pending", "TSK-001-lying.md", "completed");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    // Synonym "completed" is wrong for pending/ — folder wins.
    expect(result.fixed[0]!.statusAfter).toBe("pending");
  });

  it("dry-run reports without writing", async () => {
    await createTask("DryRun");
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");
    const path = await injectStatus("complete", "TSK-001-dryrun.md", "done");

    const result = await taskDoctor(tmp, { dryRun: true });
    expect(result.fixed).toHaveLength(1);

    const doc = await readEntity(path);
    expect((doc.frontmatter as Record<string, unknown>)["status"]).toBe("done");
  });

  it("is idempotent — second run reports no fixes", async () => {
    await createTask("Idempotent");
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");
    await injectStatus("complete", "TSK-001-idempotent.md", "completed");

    const first = await taskDoctor(tmp);
    expect(first.fixed).toHaveLength(1);

    const second = await taskDoctor(tmp);
    expect(second.fixed).toEqual([]);
  });

  it("handles uppercase / whitespace in status field", async () => {
    await createTask("Loud");
    await taskMove(tmp, "TSK-001", "active");
    await taskMove(tmp, "TSK-001", "complete");
    await injectStatus("complete", "TSK-001-loud.md", "  DONE  ");

    const result = await taskDoctor(tmp);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]!.statusAfter).toBe("complete");
  });
});
