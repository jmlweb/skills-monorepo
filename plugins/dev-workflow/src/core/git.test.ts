import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackages } from "../commands/detect-packages.js";
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

describe("diff header format ignores user config", () => {
  const scanStaged = () => scanSecrets(getStagedFiles(repo), getStagedDiff(repo));
  const scanRange = () =>
    scanSecrets(getRangeFiles(repo, "main...HEAD"), getRangeDiff(repo, "main...HEAD"));

  for (const [key, value] of [
    ["diff.noprefix", "true"],
    ["diff.mnemonicPrefix", "true"],
  ] as const) {
    it(`finds a staged secret with ${key}=${value}`, async () => {
      git("config", key, value);
      await write("src/config.ts", `export const key = "${fakeStripeKey}";\n`);
      git("add", "src/config.ts");

      expect(scanStaged().findings).toEqual([
        expect.objectContaining({ file: "src/config.ts", pattern: "stripe live key" }),
      ]);
    });

    it(`finds a committed secret in a range with ${key}=${value}`, async () => {
      git("config", key, value);
      await commit("src/config.ts", `export const key = "${fakeStripeKey}";\n`);

      expect(scanRange().findings).toEqual([
        expect.objectContaining({ file: "src/config.ts", pattern: "stripe live key" }),
      ]);
    });
  }

  it("finds a staged secret in a non-ASCII file name under default core.quotePath", async () => {
    await write("src/café.ts", `export const key = "${fakeStripeKey}";\n`);
    git("add", "src/café.ts");

    expect(getStagedFiles(repo)).toEqual(["src/café.ts"]);
    expect(scanStaged().findings).toEqual([
      expect.objectContaining({ file: "src/café.ts", pattern: "stripe live key" }),
    ]);
  });

  it("finds a committed secret in a non-ASCII file name across a range", async () => {
    await commit("src/café.ts", `export const key = "${fakeStripeKey}";\n`);

    expect(getRangeFiles(repo, "main...HEAD")).toEqual(["src/café.ts"]);
    expect(scanRange().findings).toEqual([
      expect.objectContaining({ file: "src/café.ts", pattern: "stripe live key" }),
    ]);
  });

  it("ignores an external diff driver", async () => {
    git("config", "diff.external", "true");
    await write("src/config.ts", `export const key = "${fakeStripeKey}";\n`);
    git("add", "src/config.ts");

    expect(scanStaged().findings).toHaveLength(1);
  });
});

describe("renamed and copied files", () => {
  // Enough unchanged lines that git still pairs the edited file with its source.
  const configBody = Array.from({ length: 8 }, (_, i) => `export const v${i} = ${i};\n`).join("");
  const secretLine = `export const key = "${fakeStripeKey}";\n`;
  const scanStaged = () => scanSecrets(getStagedFiles(repo), getStagedDiff(repo));
  const scanRange = () =>
    scanSecrets(getRangeFiles(repo, "main...HEAD"), getRangeDiff(repo, "main...HEAD"));

  // Moves main up to the branch tip so the range diff starts after the source file exists.
  const advanceBaseToHead = () => git("branch", "-f", "main", "HEAD");

  async function renameWithSecret(): Promise<void> {
    await commit("src/config.ts", configBody);
    advanceBaseToHead();
    git("mv", "src/config.ts", "src/app-config.ts");
    await write("src/app-config.ts", configBody + secretLine);
    git("add", "-A");
  }

  async function copyWithSecret(): Promise<void> {
    // Copies are reported as C only when copy detection is on.
    git("config", "diff.renames", "copies");
    await commit("src/config.ts", configBody);
    advanceBaseToHead();
    await write("src/config-copy.ts", configBody + secretLine);
    await write("src/config.ts", `${configBody}export const extra = 1;\n`);
    git("add", "-A");
  }

  it("flags a staged rename to .env as a sensitive filename", async () => {
    await commit("settings.txt", "A=1\n");
    git("mv", "settings.txt", ".env");

    expect(getStagedFiles(repo)).toEqual([".env"]);
    expect(scanStaged().findings.map((f) => f.pattern)).toContain("env file");
  });

  it("flags a rename to .env across a range", async () => {
    await commit("settings.txt", "A=1\n");
    advanceBaseToHead();
    git("mv", "settings.txt", ".env");
    git("commit", "-m", "rename");

    expect(getRangeFiles(repo, "main...HEAD")).toEqual([".env"]);
    expect(scanRange().findings.map((f) => f.pattern)).toContain("env file");
  });

  it("flags a secret added to a staged renamed file", async () => {
    await renameWithSecret();

    expect(scanStaged().findings).toEqual([
      expect.objectContaining({ file: "src/app-config.ts", pattern: "stripe live key" }),
    ]);
  });

  it("flags a secret added to a renamed file across a range", async () => {
    await renameWithSecret();
    git("commit", "-m", "rename");

    expect(scanRange().findings).toEqual([
      expect.objectContaining({ file: "src/app-config.ts", pattern: "stripe live key" }),
    ]);
  });

  it("flags a secret added to a staged copied file", async () => {
    await copyWithSecret();

    expect(getStagedFiles(repo).sort()).toEqual(["src/config-copy.ts", "src/config.ts"]);
    expect(scanStaged().findings).toEqual([
      expect.objectContaining({ file: "src/config-copy.ts", pattern: "stripe live key" }),
    ]);
  });

  it("flags a secret added to a copied file across a range", async () => {
    await copyWithSecret();
    git("commit", "-m", "copy");

    expect(scanRange().findings).toEqual([
      expect.objectContaining({ file: "src/config-copy.ts", pattern: "stripe live key" }),
    ]);
  });

  it("detects scope from a commit that only renames files", async () => {
    await commit("plugins/foo/src/a.ts", "export const a = 1;\n");
    advanceBaseToHead();
    git("mv", "plugins/foo/src/a.ts", "plugins/foo/src/b.ts");

    const staged = detectScope(getStagedFiles(repo), "feat/range", () => null);
    expect([...staged.scopes]).toEqual(["foo"]);

    git("commit", "-m", "rename");
    const ranged = detectScope(getRangeFiles(repo, "main...HEAD"), "feat/range", () => null);
    expect([...ranged.scopes]).toEqual(["foo"]);
  });

  it("detects packages from a staged rename", async () => {
    await commit("packages/foo/package.json", '{"name":"foo","version":"1.0.0"}\n');
    await commit("packages/foo/src/a.ts", "export const a = 1;\n");
    git("mv", "packages/foo/src/a.ts", "packages/foo/src/b.ts");

    const packages = detectPackages(getStagedFiles(repo), (dir) =>
      dir === "packages/foo"
        ? { name: "foo", shortName: "foo", private: false, dir }
        : null,
    );
    expect(packages.map((p) => p.name)).toEqual(["foo"]);
  });
});
