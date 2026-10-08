import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskUpdate, parseEvidence } from "./task-update.js";
import { taskCreate } from "./task-create.js";
import { setup } from "./setup.js";
import { readEntity } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
  await taskCreate(tmp, {
    title: "Fix bug",
    priority: "P2",
    tags: [],
    description: "Desc",
    criteria: ["Reproduce", "Fix", "Add test"],
    source: "manual",
    dependsOn: [],
  });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskUpdate", () => {
  it("updates frontmatter fields", async () => {
    const result = await taskUpdate(tmp, "TSK-001", {
      priority: "P1",
    });

    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["priority"]).toBe("P1");
  });

  it("adds a progress log entry", async () => {
    const result = await taskUpdate(
      tmp,
      "TSK-001",
      { priority: "P1" },
      "Escalated priority",
    );

    const doc = await readEntity(result.path);
    expect(doc.body).toContain("Escalated priority");
  });

  it("rejects status as a key", async () => {
    await expect(
      taskUpdate(tmp, "TSK-001", { status: "blocked" }),
    ).rejects.toThrow(/Cannot set "status" via task-update/);
  });

  it("rejects blocked-by as a key", async () => {
    await expect(
      taskUpdate(tmp, "TSK-001", { "blocked-by": "waiting for API" }),
    ).rejects.toThrow(/Cannot set "blocked-by" via task-update/);
  });

  it("throws for non-existent task", async () => {
    await expect(
      taskUpdate(tmp, "TSK-999", { priority: "P1" }),
    ).rejects.toThrow("not found");
  });

  const taskPath = async (): Promise<string> =>
    (await taskUpdate(tmp, "TSK-001", {})).path;

  it("inserts the log entry into ## Progress Log, not at the end of the body", async () => {
    const path = await taskPath();
    const original = await readFile(path, "utf-8");
    await writeFile(path, `${original.trimEnd()}\n\n## Appendix\n\nTrailing section\n`);

    await taskUpdate(tmp, "TSK-001", {}, "Investigated");

    const doc = await readEntity(path);
    const logEntry = doc.body.indexOf("Investigated");
    expect(logEntry).toBeGreaterThan(doc.body.indexOf("## Progress Log"));
    expect(logEntry).toBeLessThan(doc.body.indexOf("## Appendix"));
  });

  it("writes one dated bullet per non-empty line of a multi-line log", async () => {
    const result = await taskUpdate(tmp, "TSK-001", {}, "Fixed parser\n\nNext: add tests\n");

    const doc = await readEntity(result.path);
    expect(doc.body).toMatch(
      /- \[\d{4}-\d{2}-\d{2}\] Fixed parser\n- \[\d{4}-\d{2}-\d{2}\] Next: add tests/,
    );
  });

  it("throws a typed error when ## Progress Log is missing", async () => {
    const path = await taskPath();
    const original = await readFile(path, "utf-8");
    await writeFile(path, original.replace("## Progress Log", "## Log"));

    await expect(taskUpdate(tmp, "TSK-001", {}, "Investigated")).rejects.toMatchObject({
      name: "SectionNotFoundError",
      message: expect.stringContaining('"## Progress Log"'),
    });
  });

  it("ticks acceptance criteria by index", async () => {
    const result = await taskUpdate(tmp, "TSK-001", {}, undefined, [1, 3]);

    const doc = await readEntity(result.path);
    expect(doc.body).toContain("- [x] Reproduce\n- [ ] Fix\n- [x] Add test");
  });

  it("rejects an out-of-range criterion index without writing", async () => {
    const path = await taskPath();
    const before = await readFile(path, "utf-8");

    await expect(taskUpdate(tmp, "TSK-001", {}, "Log", [9])).rejects.toThrow(/out of range/);

    expect(await readFile(path, "utf-8")).toBe(before);
  });

  it("writes an inline evidence suffix on ticked criteria", async () => {
    const result = await taskUpdate(tmp, "TSK-001", {}, undefined, [1, 3], {
      3: "pnpm test → exit 0",
    });

    const doc = await readEntity(result.path);
    expect(doc.body).toMatch(
      /- \[x\] Reproduce\n- \[ \] Fix\n- \[x\] Add test — evidence: pnpm test → exit 0 \(\d{4}-\d{2}-\d{2}\)/,
    );
  });

  it("rejects an evidence key outside --check without writing", async () => {
    const path = await taskPath();
    const before = await readFile(path, "utf-8");

    await expect(
      taskUpdate(tmp, "TSK-001", {}, undefined, [1], { 2: "proof" }),
    ).rejects.toMatchObject({ name: "InvalidArgumentError" });

    expect(await readFile(path, "utf-8")).toBe(before);
  });

  it("parseEvidence rejects bad JSON and non-object payloads with typed errors", () => {
    expect(parseEvidence(undefined)).toEqual({});
    expect(parseEvidence('{"2":"ok"}')).toEqual({ 2: "ok" });
    for (const bad of ["{nope", "[1]", '{"a":"x"}', '{"1":5}', '{"1":" "}']) {
      expect(() => parseEvidence(bad)).toThrowError(
        expect.objectContaining({ name: "InvalidArgumentError" }),
      );
    }
  });
});
