import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackageManager, detectRunner, detectRunnerInDir, Runner } from "./detect-test-runner.js";

const none = (): boolean => false;

describe("detectRunner", () => {
  it("picks vitest and its shuffle flag, with coverage when a provider is installed", () => {
    const report = detectRunner(
      { devDependencies: { vitest: "^5.0.0", "@vitest/coverage-v8": "^5.0.0" } },
      (f) => f === "pnpm-lock.yaml",
    );
    expect(report.runner).toBe(Runner.VITEST);
    expect(report.packageManager).toBe("pnpm");
    expect(report.suiteCommand).toEqual(["pnpm", "test"]);
    expect(report.testCommand).toEqual(["pnpm", "exec", "vitest", "run", "{file}"]);
    expect(report.shuffleArgs).toEqual(["--sequence.shuffle"]);
    expect(report.coverageProvider).toBe("@vitest/coverage-v8");
    expect(report.coverageCommand).not.toBeNull();
  });

  it("reports missing vitest coverage instead of guessing", () => {
    const report = detectRunner({ devDependencies: { vitest: "^5.0.0" } }, none);
    expect(report.coverageCommand).toBeNull();
    expect(report.notes.join(" ")).toContain("No vitest coverage provider");
  });

  it("detects node:test from the test script and uses LCOV coverage", () => {
    const report = detectRunner({ scripts: { test: "node --test scripts/*.test.mjs" } }, none);
    expect(report.runner).toBe(Runner.NODE_TEST);
    expect(report.testCommand).toEqual(["node", "--test", "{file}"]);
    expect(report.coverageCommand?.join(" ")).toContain("--test-reporter=lcov");
  });

  it("detects Stryker from its config file", () => {
    const report = detectRunner({}, (f) => f === "stryker.config.mjs");
    expect(report.stryker).toBe(true);
  });

  it("returns unknown with a stop note when no runner matches", () => {
    const report = detectRunner({ scripts: { test: "make test" } }, none);
    expect(report.runner).toBe(Runner.UNKNOWN);
    expect(report.testCommand).toBeNull();
  });
});

describe("detectPackageManager", () => {
  const level =
    (...files: string[]) =>
    (name: string): boolean =>
      files.includes(name);

  it("detects package-lock.json as npm", () => {
    expect(detectPackageManager([level("package-lock.json")])).toBe("npm");
  });

  it("returns the manager of the nearest level holding any lockfile", () => {
    expect(detectPackageManager([level(), level("yarn.lock"), level("pnpm-lock.yaml")])).toBe("yarn");
    expect(detectPackageManager([level("package-lock.json"), level("pnpm-lock.yaml")])).toBe("npm");
  });

  it("prefers pnpm, then yarn, then npm within one level", () => {
    expect(detectPackageManager([level("yarn.lock", "pnpm-lock.yaml", "package-lock.json")])).toBe("pnpm");
    expect(detectPackageManager([level("package-lock.json", "yarn.lock")])).toBe("yarn");
  });

  it("defaults to npm when no level holds a lockfile", () => {
    expect(detectPackageManager([level(), level()])).toBe("npm");
  });
});

describe("detectRunnerInDir", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "runner-"));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reads package.json and lockfiles from the directory", () => {
    writeFileSync(join(root, "package.json"), JSON.stringify({ devDependencies: { jest: "^30.0.0" } }));
    writeFileSync(join(root, "yarn.lock"), "");
    const report = detectRunnerInDir(root);
    expect(report.runner).toBe(Runner.JEST);
    expect(report.packageManager).toBe("yarn");
  });

  // The fixture lives under a parent dir it controls, and the package dir holds
  // its own lockfile, so a stray lockfile above tmpdir() cannot change the result.
  const nestedPackage = (): string => {
    const pkgDir = join(root, "packages", "app");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ devDependencies: { vitest: "^5.0.0" } }));
    writeFileSync(join(root, "pnpm-lock.yaml"), "");
    return pkgDir;
  };

  it("lets a yarn.lock in the package dir beat a pnpm-lock.yaml in an ancestor", () => {
    const pkgDir = nestedPackage();
    writeFileSync(join(pkgDir, "yarn.lock"), "");
    expect(detectRunnerInDir(pkgDir).packageManager).toBe("yarn");
  });

  it("lets a package-lock.json in the package dir beat a pnpm-lock.yaml in an ancestor", () => {
    const pkgDir = nestedPackage();
    writeFileSync(join(pkgDir, "package-lock.json"), "");
    const report = detectRunnerInDir(pkgDir);
    expect(report.packageManager).toBe("npm");
    expect(report.testCommand).toEqual(["npx", "vitest", "run", "{file}"]);
  });

  it("falls back to the nearest ancestor lockfile for a workspace package", () => {
    expect(detectRunnerInDir(nestedPackage()).packageManager).toBe("pnpm");
  });

  it("fails when package.json is missing", () => {
    expect(() => detectRunnerInDir(root)).toThrow("No package.json");
  });
});
