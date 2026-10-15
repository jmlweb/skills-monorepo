import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectRunner, detectRunnerInDir, Runner } from "./detect-test-runner.js";

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

  it("fails when package.json is missing", () => {
    expect(() => detectRunnerInDir(root)).toThrow("No package.json");
  });
});
