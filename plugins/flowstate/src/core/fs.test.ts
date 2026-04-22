import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readEntity,
  writeEntity,
  moveFile,
  ensureDir,
  listFiles,
  findEntityFile,
} from "./fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("ensureDir", () => {
  it("creates nested directories", async () => {
    await ensureDir(join(tmp, "a", "b", "c"));
    const entries = await readdir(join(tmp, "a", "b"));
    expect(entries).toContain("c");
  });

  it("is idempotent", async () => {
    const dir = join(tmp, "x");
    await ensureDir(dir);
    await ensureDir(dir);
    const entries = await readdir(tmp);
    expect(entries).toContain("x");
  });
});

describe("writeEntity / readEntity", () => {
  it("writes and reads back a document", async () => {
    const path = join(tmp, "TSK-001-fix-bug.md");
    const fm = { id: "TSK-001", title: "Fix bug", status: "pending" };
    const body = "\n# Fix bug\n\n## Description\n\nSomething broke.";

    await writeEntity(path, fm, body);

    const content = await readFile(path, "utf-8");
    expect(content).toContain("id: TSK-001");
    expect(content).toContain("# Fix bug");

    const doc = await readEntity(path);
    expect(doc.frontmatter["id"]).toBe("TSK-001");
    expect(doc.body).toContain("# Fix bug");
  });
});

describe("moveFile", () => {
  it("moves a file between directories", async () => {
    const src = join(tmp, "pending");
    const dst = join(tmp, "active");
    await ensureDir(src);
    await ensureDir(dst);

    const srcPath = join(src, "TSK-001.md");
    await writeEntity(srcPath, { id: "TSK-001" }, "\nBody");

    await moveFile(srcPath, join(dst, "TSK-001.md"));

    const srcFiles = await readdir(src);
    const dstFiles = await readdir(dst);
    expect(srcFiles).not.toContain("TSK-001.md");
    expect(dstFiles).toContain("TSK-001.md");
  });
});

describe("listFiles", () => {
  it("lists .md files in directory", async () => {
    await ensureDir(tmp);
    await writeEntity(join(tmp, "TSK-001-a.md"), { id: "TSK-001" }, "\n");
    await writeEntity(join(tmp, "TSK-002-b.md"), { id: "TSK-002" }, "\n");

    const files = await listFiles(tmp);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name).sort()).toEqual([
      "TSK-001-a.md",
      "TSK-002-b.md",
    ]);
  });

  it("throws for non-existent directory", async () => {
    await expect(listFiles(join(tmp, "nope"))).rejects.toThrow();
  });
});

describe("findEntityFile", () => {
  it("finds a file by ID prefix", async () => {
    await writeEntity(join(tmp, "TSK-001-fix-bug.md"), { id: "TSK-001" }, "\n");
    await writeEntity(join(tmp, "TSK-002-add-feat.md"), { id: "TSK-002" }, "\n");

    const found = await findEntityFile(tmp, "TSK-001");
    expect(found).toBe("TSK-001-fix-bug.md");
  });

  it("returns undefined if not found", async () => {
    const found = await findEntityFile(tmp, "TSK-999");
    expect(found).toBeUndefined();
  });
});
