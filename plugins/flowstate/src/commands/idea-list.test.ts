import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ideaList } from "./idea-list.js";
import { ideaCreate } from "./idea-create.js";
import { ideaMove } from "./idea-move.js";
import { setup } from "./setup.js";
import { FileStore } from "../core/file-store.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("ideaList", () => {
  it("returns empty when no ideas exist", async () => {
    const results = await ideaList(new FileStore(tmp));
    expect(results).toEqual([]);
  });

  it("reads a backlog with no ideas/ folder as having no ideas", async () => {
    await rm(join(tmp, "ideas"), { recursive: true });
    expect(await ideaList(new FileStore(tmp), { status: "all" })).toEqual([]);
  });

  it("lists pending ideas by default", async () => {
    await ideaCreate(new FileStore(tmp), { title: "Idea A", complexity: "low", body: "body a" });
    await ideaCreate(new FileStore(tmp), { title: "Idea B", complexity: "medium", body: "body b" });

    const results = await ideaList(new FileStore(tmp));
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe("PLN-001");
    expect(results[0]!.complexity).toBe("low");
    expect(results[1]!.id).toBe("PLN-002");
  });

  it("excludes approved/discarded ideas by default", async () => {
    await ideaCreate(new FileStore(tmp), { title: "Keep", complexity: "low", body: "still pending" });
    await ideaCreate(new FileStore(tmp), { title: "Approve", complexity: "high", body: "approved" });
    await ideaMove(new FileStore(tmp), "PLN-002", "approved", "TSK-001");

    const results = await ideaList(new FileStore(tmp));
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("PLN-001");
  });

  it("includes approved/discarded with status: complete", async () => {
    await ideaCreate(new FileStore(tmp), { title: "Keep", complexity: "low", body: "pending" });
    await ideaCreate(new FileStore(tmp), { title: "Discard", complexity: "medium", body: "discard me" });
    await ideaMove(new FileStore(tmp), "PLN-002", "discarded");

    const completed = await ideaList(new FileStore(tmp), { status: "complete" });
    expect(completed).toHaveLength(1);
    expect(completed[0]!.id).toBe("PLN-002");
    expect(completed[0]!.status).toBe("discarded");
  });

  it("status: all returns both buckets", async () => {
    await ideaCreate(new FileStore(tmp), { title: "A", complexity: "low", body: "a" });
    await ideaCreate(new FileStore(tmp), { title: "B", complexity: "medium", body: "b" });
    await ideaMove(new FileStore(tmp), "PLN-002", "approved", "TSK-010");

    const all = await ideaList(new FileStore(tmp), { status: "all" });
    expect(all).toHaveLength(2);
  });

  it("respects limit", async () => {
    await ideaCreate(new FileStore(tmp), { title: "A", complexity: "low", body: "a" });
    await ideaCreate(new FileStore(tmp), { title: "B", complexity: "medium", body: "b" });
    await ideaCreate(new FileStore(tmp), { title: "C", complexity: "high", body: "c" });

    const results = await ideaList(new FileStore(tmp), { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it("sorts by ID ascending", async () => {
    await ideaCreate(new FileStore(tmp), { title: "A", complexity: "low", body: "a" });
    await ideaCreate(new FileStore(tmp), { title: "B", complexity: "medium", body: "b" });

    const results = await ideaList(new FileStore(tmp));
    expect(results[0]!.id).toBe("PLN-001");
    expect(results[1]!.id).toBe("PLN-002");
  });

  it("captures task-id when set on approved ideas", async () => {
    await ideaCreate(new FileStore(tmp), { title: "A", complexity: "low", body: "a" });
    await ideaMove(new FileStore(tmp), "PLN-001", "approved", "TSK-042");

    const all = await ideaList(new FileStore(tmp), { status: "all" });
    expect(all[0]!.taskId).toBe("TSK-042");
  });
});
