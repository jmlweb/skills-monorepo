import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setup } from "../commands/setup.js";
import { FileStore } from "./file-store.js";
import type { BacklogStore, StoredType } from "./store.js";

// Every backend must pass this suite. A new backend adds one entry here.
interface Backend {
  readonly name: string;
  readonly open: () => Promise<{ store: BacklogStore; close: () => Promise<void> }>;
}

const BACKENDS: readonly Backend[] = [
  {
    name: "FileStore",
    open: async () => {
      const dir = await mkdtemp(join(tmpdir(), "flowstate-store-"));
      await setup(dir, "Test");
      return {
        store: new FileStore(dir),
        close: () => rm(dir, { recursive: true, force: true }),
      };
    },
  },
];

const ID_PATTERN: Record<StoredType, RegExp> = {
  task: /^TSK-\d{3,}$/,
  idea: /^PLN-\d{3,}$/,
  report: /^RPT-\d{3,}$/,
};

const create = (store: BacklogStore, type: StoredType, title: string) =>
  store.create(type, {
    title,
    frontmatter: (id) => ({ id, title, status: "pending" }),
    body: `\n# ${title}\n`,
  });

for (const backend of BACKENDS) {
  describe(`BacklogStore contract: ${backend.name}`, () => {
    let store: BacklogStore;
    let close: () => Promise<void>;

    beforeEach(async () => {
      ({ store, close } = await backend.open());
    });

    afterEach(async () => {
      await close();
    });

    it("lists nothing on a fresh backlog", async () => {
      expect(await store.list("task", ["pending", "active", "complete"])).toEqual([]);
      expect(await store.list("idea", ["pending", "complete"])).toEqual([]);
      expect(await store.list("report", ["pending", "complete"])).toEqual([]);
    });

    for (const type of ["task", "idea", "report"] as const) {
      it(`creates a ${type} in pending with a fresh ID of its type`, async () => {
        const first = await create(store, type, "First");
        const second = await create(store, type, "Second");

        expect(first.id).toMatch(ID_PATTERN[type]);
        expect(second.id).not.toBe(first.id);
        expect(first.bucket).toBe("pending");
        expect(first.frontmatter["id"]).toBe(first.id);

        const found = await store.find(type, first.id, ["pending"]);
        expect(found?.frontmatter["title"]).toBe("First");
        expect(found?.body).toContain("# First");
      });
    }

    it("keeps IDs separate per type", async () => {
      const task = await create(store, "task", "Task");
      await create(store, "idea", "Idea");

      expect(await store.find("idea", task.id, ["pending", "complete"])).toBeUndefined();
      expect(await store.list("task", ["pending"])).toHaveLength(1);
    });

    it("finds nothing for an unknown ID or outside the given buckets", async () => {
      const task = await create(store, "task", "Task");

      expect(await store.find("task", "TSK-999", ["pending", "active", "complete"])).toBeUndefined();
      expect(await store.find("task", task.id, ["active", "complete"])).toBeUndefined();
    });

    it("saves frontmatter and body in place without a target bucket", async () => {
      const task = await create(store, "task", "Task");
      await store.save(task, { ...task.frontmatter, priority: "P1" }, "\nNew body\n");

      const found = await store.find("task", task.id, ["pending"]);
      expect(found?.frontmatter["priority"]).toBe("P1");
      expect(found?.body).toContain("New body");
    });

    it("moves an entity between buckets on save", async () => {
      const task = await create(store, "task", "Task");
      const moved = await store.save(task, { ...task.frontmatter, status: "active" }, task.body, "active");

      expect(moved.bucket).toBe("active");
      expect(await store.find("task", task.id, ["pending"])).toBeUndefined();
      expect((await store.list("task", ["active"])).map((t) => t.id)).toEqual([task.id]);
    });

    it("moves an idea and a report to complete", async () => {
      const idea = await create(store, "idea", "Idea");
      const report = await create(store, "report", "Report");
      await store.save(idea, { ...idea.frontmatter, status: "approved" }, idea.body, "complete");
      await store.save(report, { ...report.frontmatter, status: "triaged" }, report.body, "complete");

      expect((await store.find("idea", idea.id, ["complete"]))?.frontmatter["status"]).toBe("approved");
      expect((await store.find("report", report.id, ["complete"]))?.frontmatter["status"]).toBe("triaged");
      expect(await store.list("idea", ["pending"])).toEqual([]);
    });

    it("lists the requested buckets in order", async () => {
      const a = await create(store, "task", "A");
      const b = await create(store, "task", "B");
      await store.save(a, a.frontmatter, a.body, "complete");

      const ids = (await store.list("task", ["pending", "complete"])).map((t) => t.id);
      expect(ids).toEqual([b.id, a.id]);
    });
  });
}
