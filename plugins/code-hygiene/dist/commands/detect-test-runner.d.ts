export declare const Runner: {
    readonly VITEST: "vitest";
    readonly JEST: "jest";
    readonly NODE_TEST: "node:test";
    readonly UNKNOWN: "unknown";
};
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
type PackageManager = RunnerReport["packageManager"];
type HasFile = (name: string) => boolean;
export declare function detectPackageManager(levels: Iterable<HasFile>): PackageManager;
export declare function detectRunner(pkg: PackageJson, hasFile: HasFile, pm?: PackageManager): RunnerReport;
export declare function detectRunnerInDir(root: string): RunnerReport;
export {};
