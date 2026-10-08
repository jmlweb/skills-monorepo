import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectScope } from "../commands/detect-scope.js";
import { scanSecrets } from "../commands/scan-secrets.js";
import { InvalidArgumentError } from "./errors.js";
import {
  getRangeDiff,
  getRangeFiles,
  getStagedDiff,
  getStagedFiles,
} from "./git.js";

let repo: string;

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: repo, stdio: "ignore" });
}

async function write(rel: string, content: string): Promise<void> {
  const full = join(repo, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}

async function commit(rel: string, content: string): Promise<void> {
  await write(rel, content);
  git("add", rel);
  git("commit", "-m", `add ${rel}`);
}

// Assembled at runtime so no literal key sits in the repo.
const fakeStripeKey = `sk_live_${"a1B2c3D4".repeat(3)}`;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "dev-workflow-range-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  git("config", "commit.gpgsign", "false");
  await commit("README.md", "# base\n");
  git("checkout", "-b", "feat/range");
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe("range helpers", () => {
  it("lists files added or modified across commits ahead of the base", async () => {
    await commit("plugins/foo/src/a.ts", "export const a = 1;\n");
    await commit("plugins/bar/src/b.ts", "export const b = 2;\n");

    expect(getRangeFiles(repo, "main...HEAD").sort()).toEqual([
      "plugins/bar/src/b.ts",
      "plugins/foo/src/a.ts",
    ]);
    expect(getRangeDiff(repo, "main...HEAD")).toContain("+export const a = 1;");
  });

  it("ignores base-branch changes made after the branch point", async () => {
    await commit("plugins/foo/src/a.ts", "export const a = 1;\n");
    git("checkout", "main");
    await commit("only-on-main.txt", "x\n");
    git("checkout", "feat/range");

    expect(getRangeFiles(repo, "main...HEAD")).toEqual(["plugins/foo/src/a.ts"]);
  });

  it("returns nothing when no commits are ahead", () => {
    expect(getRangeFiles(repo, "main...HEAD")).toEqual([]);
    expect(getRangeDiff(repo, "main...HEAD")).toBe("");
  });

  it("rejects ranges that are not <base>...HEAD or look like options", () => {
    for (const bad of ["main", "main..HEAD", "--output=x...HEAD", "a b...HEAD", ""]) {
      expect(() => getRangeFiles(repo, bad)).toThrow(InvalidArgumentError);
      expect(() => getRangeDiff(repo, bad)).toThrow(InvalidArgumentError);
    }
  });
});

describe("range-based scanning", () => {
  it("finds a secret committed earlier in the branch even though nothing is staged", async () => {
    await commit("src/config.ts", `export const key = "${fakeStripeKey}";\n`);
    await commit("src/clean.ts", "export const ok = true;\n");

    const staged = scanSecrets(getStagedFiles(repo), getStagedDiff(repo));
    const ranged = scanSecrets(
      getRangeFiles(repo, "main...HEAD"),
      getRangeDiff(repo, "main...HEAD"),
    );

    expect(staged.findings).toEqual([]);
    expect(ranged.findings).toHaveLength(1);
    expect(ranged.findings[0]).toMatchObject({
      file: "src/config.ts",
      reason: "secret-pattern",
      pattern: "stripe live key",
    });
  });

  it("flags sensitive filenames added anywhere in the range", async () => {
    await commit(".env", "A=1\n");
    await commit("src/clean.ts", "export const ok = true;\n");

    const ranged = scanSecrets(
      getRangeFiles(repo, "main...HEAD"),
      getRangeDiff(repo, "main...HEAD"),
    );

    expect(ranged.findings.map((f) => f.pattern)).toContain("env file");
  });

  it("detects scope from every commit in the range", async () => {
    await commit("plugins/foo/src/a.ts", "export const a = 1;\n");
    await commit("plugins/bar/src/b.ts", "export const b = 2;\n");

    const result = detectScope(
      getRangeFiles(repo, "main...HEAD"),
      "feat/range",
      () => null,
    );

    expect(result.source).toBe("files");
    expect([...result.scopes].sort()).toEqual(["bar", "foo"]);
  });
});

describe("staged-only default", () => {
  it("still reads only the index when no range is used", async () => {
    await commit("plugins/foo/src/a.ts", "export const a = 1;\n");
    await write("plugins/bar/src/b.ts", "export const b = 2;\n");
    git("add", "plugins/bar/src/b.ts");

    expect(getStagedFiles(repo)).toEqual(["plugins/bar/src/b.ts"]);
  });
});
