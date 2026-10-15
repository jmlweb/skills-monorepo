import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TestCommandError } from "../core/errors.js";

export const Runner = {
  VITEST: "vitest",
  JEST: "jest",
  NODE_TEST: "node:test",
  UNKNOWN: "unknown",
} as const;
export type Runner = (typeof Runner)[keyof typeof Runner];

export type RunnerReport = {
  readonly runner: Runner;
  readonly packageManager: "pnpm" | "yarn" | "npm";
  readonly suiteCommand: readonly string[];
  readonly testCommand: readonly string[] | null;
  readonly coverageCommand: readonly string[] | null;
  readonly shuffleArgs: readonly string[];
  readonly coverageProvider: string | null;
  readonly stryker: boolean;
  readonly notes: readonly string[];
};

type PackageJson = {
  readonly scripts?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

const COVERAGE_PROVIDERS = ["@vitest/coverage-v8", "@vitest/coverage-istanbul"];

export function detectPackageManager(
  hasFile: (name: string) => boolean,
): RunnerReport["packageManager"] {
  if (hasFile("pnpm-lock.yaml")) return "pnpm";
  if (hasFile("yarn.lock")) return "yarn";
  return "npm";
}

function execPrefix(pm: RunnerReport["packageManager"]): readonly string[] {
  if (pm === "pnpm") return ["pnpm", "exec"];
  if (pm === "yarn") return ["yarn", "exec"];
  return ["npx"];
}

// Placeholders {file} and {dir} are filled by the caller per test file, so a
// path is never spliced into a shell string.
export function detectRunner(
  pkg: PackageJson,
  hasFile: (name: string) => boolean,
): RunnerReport {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const pm = detectPackageManager(hasFile);
  const exec = execPrefix(pm);
  const stryker = "@stryker-mutator/core" in deps || hasFile("stryker.conf.json") || hasFile("stryker.config.mjs");
  const coverageProvider = COVERAGE_PROVIDERS.find((p) => p in deps) ?? null;
  const notes: string[] = [];

  if ("vitest" in deps) {
    const coverage = coverageProvider
      ? [...exec, "vitest", "run", "{file}", "--coverage.enabled", "--coverage.reporter=json", "--coverage.reportsDirectory={dir}"]
      : null;
    if (!coverageProvider) notes.push("No vitest coverage provider installed; coverage-subsets cannot run.");
    return {
      runner: Runner.VITEST,
      packageManager: pm,
    suiteCommand: [pm, "test"],
      testCommand: [...exec, "vitest", "run", "{file}"],
      coverageCommand: coverage,
      shuffleArgs: ["--sequence.shuffle"],
      coverageProvider,
      stryker,
      notes,
    };
  }

  if ("jest" in deps) {
    return {
      runner: Runner.JEST,
      packageManager: pm,
    suiteCommand: [pm, "test"],
      testCommand: [...exec, "jest", "{file}"],
      coverageCommand: [...exec, "jest", "{file}", "--coverage", "--coverageReporters=json", "--coverageDirectory={dir}"],
      shuffleArgs: ["--randomize"],
      coverageProvider: "jest",
      stryker,
      notes,
    };
  }

  if (pkg.scripts?.["test"]?.includes("node --test")) {
    return {
      runner: Runner.NODE_TEST,
      packageManager: pm,
    suiteCommand: [pm, "test"],
      testCommand: ["node", "--test", "{file}"],
      coverageCommand: [
        "node", "--test", "--experimental-test-coverage",
        "--test-reporter=lcov", "--test-reporter-destination={dir}/lcov.info", "{file}",
      ],
      shuffleArgs: [],
      coverageProvider: "node:test",
      stryker,
      notes: [...notes, "node:test has no shuffle flag; order-dependence is not checked."],
    };
  }

  return {
    runner: Runner.UNKNOWN,
    packageManager: pm,
    suiteCommand: [pm, "test"],
    testCommand: null,
    coverageCommand: null,
    shuffleArgs: [],
    coverageProvider: null,
    stryker,
    notes: [...notes, "No supported runner found (vitest, jest or node --test). Stop and ask the user for the test command."],
  };
}

export function detectRunnerInDir(root: string): RunnerReport {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    throw new TestCommandError(`No package.json in ${root}.`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
  // Lockfiles sit at the workspace root, above a package that is tested alone.
  return detectRunner(pkg, (name) => existsInAncestors(root, name));
}

function existsInAncestors(start: string, name: string): boolean {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, name))) return true;
    const parent = dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}
