import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir } from "./fs.js";
import { backlogRoot, taskDir, ideaDir, reportDir, taskIndexPath, findBacklogRoot } from "./paths.js";

describe("paths", () => {
  const cwd = "/project";

  it("backlogRoot", () => {
    expect(backlogRoot(cwd)).toBe("/project/.backlog");
  });

  it("taskDir for each status", () => {
    expect(taskDir(cwd, "pending")).toBe("/project/.backlog/tasks/pending");
    expect(taskDir(cwd, "active")).toBe("/project/.backlog/tasks/active");
    expect(taskDir(cwd, "complete")).toBe("/project/.backlog/tasks/complete");
  });

  it("taskDir for blocked maps to active", () => {
    expect(taskDir(cwd, "blocked")).toBe("/project/.backlog/tasks/active");
  });

  it("ideaDir", () => {
    expect(ideaDir(cwd, "pending")).toBe("/project/.backlog/ideas/pending");
    expect(ideaDir(cwd, "complete")).toBe("/project/.backlog/ideas/complete");
  });

  it("reportDir", () => {
    expect(reportDir(cwd, "pending")).toBe("/project/.backlog/reports/pending");
  });

  it("taskIndexPath", () => {
    expect(taskIndexPath(cwd)).toBe("/project/.backlog/tasks/index.md");
  });
});

describe("findBacklogRoot", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "flowstate-paths-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("finds .backlog/ in the current directory", async () => {
    await ensureDir(join(tmp, ".backlog"));
    expect(findBacklogRoot(tmp)).toBe(tmp);
  });

  it("walks up to find .backlog/ in a parent directory", async () => {
    await ensureDir(join(tmp, ".backlog"));
    const sub = join(tmp, "apps", "core", "src");
    await ensureDir(sub);
    expect(findBacklogRoot(sub)).toBe(tmp);
  });

  it("throws when no .backlog/ exists in any ancestor", () => {
    expect(() => findBacklogRoot(tmp)).toThrow(
      /No \.backlog\/ directory found/,
    );
  });
});
