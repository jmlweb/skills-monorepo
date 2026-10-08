import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemplateLookupError } from "../core/errors.js";
import { findPrTemplate } from "./find-pr-template.js";

let root: string;
let repo: string;
let userDir: string;
let builtinPath: string;

async function put(path: string): Promise<string> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, "## Why\n");
  return path;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "find-pr-template-"));
  repo = join(root, "repo");
  userDir = join(root, "user");
  await mkdir(repo, { recursive: true });
  await mkdir(userDir, { recursive: true });
  builtinPath = await put(join(root, "builtin", "default-pr-template.md"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("findPrTemplate precedence", () => {
  it("prefers .github/pull_request_template.md over everything else", async () => {
    const github = await put(join(repo, ".github", "pull_request_template.md"));
    await put(join(repo, "docs", "pull_request_template.md"));
    await put(join(userDir, "pr-template.md"));

    const result = findPrTemplate({ cwd: repo, userDir, builtinPath });

    expect(result).toEqual({ source: "repo", path: github, candidates: [github] });
  });

  it("falls back to a single template in docs/", async () => {
    const docs = await put(join(repo, "docs", "pull_request_template.md"));
    await put(join(userDir, "pr-template.md"));

    const result = findPrTemplate({ cwd: repo, userDir, builtinPath });

    expect(result.source).toBe("repo");
    expect(result.path).toBe(docs);
  });

  it("finds a root-level template", async () => {
    const rootTemplate = await put(join(repo, "pull_request_template.md"));

    const result = findPrTemplate({ cwd: repo, builtinPath });

    expect(result.path).toBe(rootTemplate);
  });

  it("matches the file name case-insensitively like GitHub", async () => {
    const upper = await put(join(repo, ".github", "PULL_REQUEST_TEMPLATE.md"));

    const result = findPrTemplate({ cwd: repo, builtinPath });

    expect(result.path).toBe(upper);
  });

  it("returns all candidates with a null path when several repo templates match", async () => {
    const a = await put(join(repo, ".github", "PULL_REQUEST_TEMPLATE", "bug.md"));
    const b = await put(join(repo, ".github", "PULL_REQUEST_TEMPLATE", "feature.md"));
    const docs = await put(join(repo, "docs", "pull_request_template.md"));
    await put(join(userDir, "pr-template.md"));

    const result = findPrTemplate({ cwd: repo, userDir, builtinPath });

    expect(result.source).toBe("repo");
    expect(result.path).toBeNull();
    expect([...result.candidates].sort()).toEqual([a, b, docs].sort());
  });

  it("ignores non-markdown files inside a template directory", async () => {
    const md = await put(join(repo, ".github", "PULL_REQUEST_TEMPLATE", "bug.md"));
    await put(join(repo, ".github", "PULL_REQUEST_TEMPLATE", "notes.txt"));

    const result = findPrTemplate({ cwd: repo, builtinPath });

    expect(result.candidates).toEqual([md]);
    expect(result.path).toBe(md);
  });

  it("uses the user template when the repo has none", async () => {
    const user = await put(join(userDir, "pr-template.md"));

    const result = findPrTemplate({ cwd: repo, userDir, builtinPath });

    expect(result).toEqual({ source: "user", path: user, candidates: [user] });
  });

  it("falls back to the built-in template when nothing else matches", () => {
    const result = findPrTemplate({ cwd: repo, userDir, builtinPath });

    expect(result).toEqual({
      source: "builtin",
      path: builtinPath,
      candidates: [builtinPath],
    });
  });

  it("resolves the bundled built-in template by default", () => {
    const result = findPrTemplate({ cwd: repo });

    expect(result.source).toBe("builtin");
    expect(result.path).toMatch(/references\/default-pr-template\.md$/);
  });
});

describe("findPrTemplate user-dir handling", () => {
  it("treats a missing user directory as no user template", () => {
    const result = findPrTemplate({
      cwd: repo,
      userDir: join(root, "does-not-exist"),
      builtinPath,
    });

    expect(result.source).toBe("builtin");
  });

  it("treats an omitted or empty user dir as no user template", async () => {
    await put(join(userDir, "pr-template.md"));

    expect(findPrTemplate({ cwd: repo, builtinPath }).source).toBe("builtin");
    expect(findPrTemplate({ cwd: repo, userDir: "", builtinPath }).source).toBe(
      "builtin",
    );
  });

  it("throws on fs errors other than a missing path", async () => {
    // A path loop surfaces ELOOP, which must not be mistaken for "absent".
    const { symlink } = await import("node:fs/promises");
    const loop = join(root, "loop");
    await symlink(loop, loop);

    expect(() => findPrTemplate({ cwd: repo, userDir: loop, builtinPath })).toThrow(
      TemplateLookupError,
    );
  });

  it("throws when the repo's .github directory is unreadable", async () => {
    if (process.getuid?.() === 0) return;
    await put(join(repo, ".github", "pull_request_template.md"));
    await chmod(join(repo, ".github"), 0o000);

    try {
      expect(() => findPrTemplate({ cwd: repo, builtinPath })).toThrow(
        TemplateLookupError,
      );
    } finally {
      await chmod(join(repo, ".github"), 0o755);
    }
  });

  it("throws when the built-in template is missing", () => {
    expect(() =>
      findPrTemplate({ cwd: repo, builtinPath: join(root, "nope.md") }),
    ).toThrow(TemplateLookupError);
  });
});
