import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskList } from "./task-list.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskList", () => {
  it("lists all tasks when no filter", async () => {
    await taskCreate(tmp, {
      title: "Task A",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskCreate(tmp, {
      title: "Task B",
      priority: "P1",
      tags: ["urgent"],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const items = await taskList(tmp);
    expect(items).toHaveLength(2);
    expect(items.map((t) => t.id).sort()).toEqual(["TSK-001", "TSK-002"]);
  });

  it("filters by status", async () => {
    await taskCreate(tmp, {
      title: "Pending",
      priority: "P3",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskCreate(tmp, {
      title: "Will be active",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskMove(tmp, "TSK-002", "active");

    const pending = await taskList(tmp, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe("TSK-001");

    const active = await taskList(tmp, "active");
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe("TSK-002");
  });

  it("returns empty for no tasks", async () => {
    const items = await taskList(tmp);
    expect(items).toEqual([]);
  });

  it("sorts by priority", async () => {
    await taskCreate(tmp, {
      title: "Low prio",
      priority: "P3",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskCreate(tmp, {
      title: "High prio",
      priority: "P1",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });
    await taskCreate(tmp, {
      title: "Mid prio",
      priority: "P2",
      tags: [],
      description: "",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const items = await taskList(tmp);
    expect(items.map((t) => t.priority)).toEqual(["P1", "P2", "P3"]);
  });

  it("respects limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await taskCreate(tmp, {
        title: `Task ${i}`,
        priority: "P2",
        tags: [],
        description: "",
        criteria: [],
        source: "manual",
        dependsOn: [],
      });
    }

    const limited = await taskList(tmp, undefined, 3);
    expect(limited).toHaveLength(3);

    const unlimited = await taskList(tmp);
    expect(unlimited).toHaveLength(5);
  });
});
