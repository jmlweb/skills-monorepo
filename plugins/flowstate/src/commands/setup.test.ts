import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("setup", () => {
  it("creates .backlog directory structure", async () => {
    await setup(tmp, "Test Project");

    const backlog = join(tmp, ".backlog");
    const entries = await readdir(backlog);
    expect(entries.sort()).toEqual(["ideas", "learnings", "reports", "tasks"]);

    const tasks = await readdir(join(backlog, "tasks"));
    expect(tasks.sort()).toEqual(["active", "complete", "index.md", "pending"]);

    const ideas = await readdir(join(backlog, "ideas"));
    expect(ideas.sort()).toEqual(["complete", "pending"]);

    const reports = await readdir(join(backlog, "reports"));
    expect(reports.sort()).toEqual(["complete", "pending"]);
  });

  it("creates index files with project name", async () => {
    await setup(tmp, "My Cool Project");

    const taskIndex = await readFile(
      join(tmp, ".backlog", "tasks", "index.md"),
      "utf-8",
    );
    expect(taskIndex).toContain("# My Cool Project - Task Index");
    expect(taskIndex).toContain("| Pending | 0 |");

    const learningsIndex = await readFile(
      join(tmp, ".backlog", "learnings", "index.md"),
      "utf-8",
    );
    expect(learningsIndex).toContain("# My Cool Project - Learnings Index");
  });

  it("is idempotent", async () => {
    await setup(tmp, "Project");
    await setup(tmp, "Project");

    const entries = await readdir(join(tmp, ".backlog", "tasks"));
    expect(entries).toContain("index.md");
  });

  it("migrates plans/ to ideas/", async () => {
    const backlog = join(tmp, ".backlog");
    const oldPending = join(backlog, "plans", "pending");
    const oldComplete = join(backlog, "plans", "complete");
    await mkdir(oldPending, { recursive: true });
    await mkdir(oldComplete, { recursive: true });
    await writeFile(join(oldPending, "PLN-001-test.md"), "---\nid: PLN-001\n---\n");

    await setup(tmp, "Project");

    const entries = await readdir(backlog);
    expect(entries).not.toContain("plans");
    expect(entries).toContain("ideas");

    const ideaPending = await readdir(join(backlog, "ideas", "pending"));
    expect(ideaPending).toContain("PLN-001-test.md");
  });

  it("skips migration when both plans/ and ideas/ exist", async () => {
    const backlog = join(tmp, ".backlog");
    await mkdir(join(backlog, "plans", "pending"), { recursive: true });
    await mkdir(join(backlog, "ideas", "pending"), { recursive: true });
    await writeFile(join(backlog, "plans", "pending", "PLN-001-old.md"), "old");
    await writeFile(join(backlog, "ideas", "pending", "PLN-002-new.md"), "new");

    await setup(tmp, "Project");

    const entries = await readdir(backlog);
    expect(entries).toContain("plans");
    expect(entries).toContain("ideas");
  });
});
