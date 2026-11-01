import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TestCommandError } from "../core/errors.js";
export const Runner = {
    VITEST: "vitest",
    JEST: "jest",
    NODE_TEST: "node:test",
    UNKNOWN: "unknown",
};
const COVERAGE_PROVIDERS = ["@vitest/coverage-v8", "@vitest/coverage-istanbul"];
// Checked in this order within one directory when several lockfiles coexist.
const LOCKFILES = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
];
const lockfileManager = (hasFile) => LOCKFILES.find(([lockfile]) => hasFile(lockfile))?.[1] ?? null;
// `levels` runs from the package dir outward, so the nearest lockfile wins and a
// workspace-root lockfile only counts when nothing closer has one.
export function detectPackageManager(levels) {
    for (const hasFile of levels) {
        const manager = lockfileManager(hasFile);
        if (manager)
            return manager;
    }
    return "npm";
}
function execPrefix(pm) {
    if (pm === "pnpm")
        return ["pnpm", "exec"];
    if (pm === "yarn")
        return ["yarn", "exec"];
    return ["npx"];
}
// Placeholders {file} and {dir} are filled by the caller per test file, so a
// path is never spliced into a shell string.
export function detectRunner(pkg, hasFile, pm = detectPackageManager([hasFile])) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const exec = execPrefix(pm);
    const stryker = "@stryker-mutator/core" in deps || hasFile("stryker.conf.json") || hasFile("stryker.config.mjs");
    const coverageProvider = COVERAGE_PROVIDERS.find((p) => p in deps) ?? null;
    const notes = [];
    if ("vitest" in deps) {
        const coverage = coverageProvider
            ? [...exec, "vitest", "run", "{file}", "--coverage.enabled", "--coverage.reporter=json", "--coverage.reportsDirectory={dir}"]
            : null;
        if (!coverageProvider)
            notes.push("No vitest coverage provider installed; coverage-subsets cannot run.");
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
export function detectRunnerInDir(root) {
    const pkgPath = join(root, "package.json");
    if (!existsSync(pkgPath)) {
        throw new TestCommandError(`No package.json in ${root}.`);
    }
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const levels = ancestorsOf(root).map((dir) => (name) => existsSync(join(dir, name)));
    // Lockfiles sit at the workspace root, above a package that is tested alone.
    const hasFileInAncestors = (name) => levels.some((hasFile) => hasFile(name));
    return detectRunner(pkg, hasFileInAncestors, detectPackageManager(levels));
}
function ancestorsOf(start) {
    const parent = dirname(start);
    return parent === start ? [start] : [start, ...ancestorsOf(parent)];
}
