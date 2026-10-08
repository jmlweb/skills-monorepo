import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir } from "./fs.js";
import {
  taskDir,
  ideaDir,
  reportDir,
  taskIndexPath,
  findBacklogRoot,
  resolveBacklog,
  resolveSetupTarget,
  settingsSnippet,
} from "./paths.js";
import {
  BacklogDirMissingError,
  BacklogNotFoundError,
  InvalidArgumentError,
} from "./errors.js";

describe("paths", () => {
  const root = "/backlog";

  it("taskDir for each status", () => {
    expect(taskDir(root, "pending")).toBe("/backlog/tasks/pending");
    expect(taskDir(root, "active")).toBe("/backlog/tasks/active");
    expect(taskDir(root, "complete")).toBe("/backlog/tasks/complete");
  });

  it("taskDir for blocked maps to active", () => {
    expect(taskDir(root, "blocked")).toBe("/backlog/tasks/active");
  });

  it("ideaDir", () => {
    expect(ideaDir(root, "pending")).toBe("/backlog/ideas/pending");
    expect(ideaDir(root, "complete")).toBe("/backlog/ideas/complete");
  });

  it("reportDir", () => {
    expect(reportDir(root, "pending")).toBe("/backlog/reports/pending");
  });

  it("taskIndexPath", () => {
    expect(taskIndexPath(root)).toBe("/backlog/tasks/index.md");
  });
});

describe("resolveBacklog", () => {
  let tmp: string;
  const noEnv = {};

  beforeEach(async () => {
    tmp = await realpath(await mkdtemp(join(tmpdir(), "flowstate-paths-")));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("walk-up: finds .backlog/ in the current directory", async () => {
    await ensureDir(join(tmp, ".backlog"));
    expect(findBacklogRoot(tmp, noEnv)).toBe(join(tmp, ".backlog"));
    expect(resolveBacklog(tmp, noEnv).source).toBe("walk-up");
  });

  it("walk-up: finds .backlog/ in a parent directory", async () => {
    await ensureDir(join(tmp, ".backlog"));
    const sub = join(tmp, "apps", "core", "src");
    await ensureDir(sub);
    expect(findBacklogRoot(sub, noEnv)).toBe(join(tmp, ".backlog"));
  });

  it("walk-up: throws BacklogNotFoundError mentioning both sources", () => {
    expect(() => findBacklogRoot(tmp, noEnv)).toThrow(BacklogNotFoundError);
    expect(() => findBacklogRoot(tmp, noEnv)).toThrow(
      /No \.backlog\/ directory found.*FLOWSTATE_BACKLOG_DIR/,
    );
  });

  it("env: absolute path wins over a walk-up .backlog/", async () => {
    await ensureDir(join(tmp, ".backlog"));
    const priv = join(tmp, "private");
    await ensureDir(priv);
    const resolved = resolveBacklog(tmp, { FLOWSTATE_BACKLOG_DIR: priv });
    expect(resolved).toEqual({ dir: priv, source: "env" });
  });

  it("env: relative path resolves against the project root, not cwd", async () => {
    await writeFile(join(tmp, ".git"), "gitdir: elsewhere\n");
    await ensureDir(join(tmp, "private"));
    const sub = join(tmp, "apps", "core");
    await ensureDir(sub);
    const resolved = resolveBacklog(sub, { FLOWSTATE_BACKLOG_DIR: "private" });
    expect(resolved).toEqual({ dir: join(tmp, "private"), source: "env" });
  });

  it("env: unset or empty falls back to walk-up", async () => {
    await ensureDir(join(tmp, ".backlog"));
    expect(resolveBacklog(tmp, { FLOWSTATE_BACKLOG_DIR: "" }).source).toBe(
      "walk-up",
    );
  });

  it("env: pointing at a missing directory throws instead of returning empty", async () => {
    await ensureDir(join(tmp, ".backlog"));
    const missing = join(tmp, "nope");
    expect(() =>
      resolveBacklog(tmp, { FLOWSTATE_BACKLOG_DIR: missing }),
    ).toThrow(BacklogDirMissingError);
    expect(() =>
      resolveBacklog(tmp, { FLOWSTATE_BACKLOG_DIR: missing }),
    ).toThrow(/does not exist/);
  });
});

describe("resolveSetupTarget", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await realpath(await mkdtemp(join(tmpdir(), "flowstate-setup-")));
    await writeFile(join(tmp, ".git"), "gitdir: elsewhere\n");
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("defaults to <cwd>/.backlog", () => {
    expect(resolveSetupTarget(tmp, {}, {})).toEqual({
      dir: join(tmp, ".backlog"),
      isCustom: false,
    });
  });

  it("uses FLOWSTATE_BACKLOG_DIR when set, even if it does not exist yet", () => {
    const dir = join(tmp, "later");
    expect(
      resolveSetupTarget(tmp, {}, { FLOWSTATE_BACKLOG_DIR: dir }),
    ).toEqual({ dir, isCustom: false });
  });

  it("--dir: absolute and project-root-relative", () => {
    expect(resolveSetupTarget(tmp, { dir: "/x/y" }, {}).dir).toBe("/x/y");
    const sub = join(tmp, "sub");
    expect(resolveSetupTarget(sub, { dir: "priv" }, {})).toEqual({
      dir: join(tmp, "priv"),
      isCustom: true,
    });
  });

  it("rejects --dir together with --private", () => {
    expect(() =>
      resolveSetupTarget(tmp, { dir: "x", isPrivate: true }, {}),
    ).toThrow(InvalidArgumentError);
  });

  it("settingsSnippet embeds the variable", () => {
    expect(JSON.parse(settingsSnippet("/a/b"))).toEqual({
      env: { FLOWSTATE_BACKLOG_DIR: "/a/b" },
    });
  });
});
