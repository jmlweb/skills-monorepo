import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { nextId } from "./next-id.js";
import { setup } from "./setup.js";
import { ensureDir } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("nextId", () => {
  it("returns 001 for empty backlog", async () => {
    expect(await nextId(tmp, "task")).toBe("TSK-001");
    expect(await nextId(tmp, "idea")).toBe("PLN-001");
    expect(await nextId(tmp, "report")).toBe("RPT-001");
    expect(await nextId(tmp, "learning")).toBe("LRN-001");
  });

  it("returns next sequential ID", async () => {
    const pending = join(tmp, ".backlog", "tasks", "pending");
    await writeFile(join(pending, "TSK-001-fix-bug.md"), "---\nid: TSK-001\n---\n");
    await writeFile(join(pending, "TSK-003-add-feat.md"), "---\nid: TSK-003\n---\n");

    expect(await nextId(tmp, "task")).toBe("TSK-004");
  });

  it("scans all subdirectories for tasks", async () => {
    const pending = join(tmp, ".backlog", "tasks", "pending");
    const active = join(tmp, ".backlog", "tasks", "active");
    const complete = join(tmp, ".backlog", "tasks", "complete");

    await writeFile(join(pending, "TSK-001-a.md"), "");
    await writeFile(join(active, "TSK-005-b.md"), "");
    await writeFile(join(complete, "TSK-003-c.md"), "");

    expect(await nextId(tmp, "task")).toBe("TSK-006");
  });

  it("scans learning directories", async () => {
    const learnings = join(tmp, ".backlog", "learnings");
    await ensureDir(join(learnings, "LRN-002-some-insight"));

    expect(await nextId(tmp, "learning")).toBe("LRN-003");
  });
});
