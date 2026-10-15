export declare const Claim: {
    readonly LINES: "lines";
    readonly TIME: "time";
    readonly FOLD: "fold";
};
export type Claim = (typeof Claim)[keyof typeof Claim];
export type VerifyOptions = {
    readonly cwd: string;
    readonly file: string;
    readonly rewrittenPath: string;
    readonly command: readonly string[];
    readonly shuffleArgs: readonly string[];
    readonly runs: number;
    readonly timeoutMs: number;
    readonly claim: Claim;
    readonly coverageCommand: readonly string[] | null;
};
export type CoverageCheck = {
    readonly before: number;
    readonly after: number;
    readonly lost: readonly string[];
};
export type RunSummary = {
    readonly passed: boolean;
    readonly cases: number | null;
    readonly medianMs: number;
    readonly spreadMs: number;
};
export type VerifyReport = {
    readonly file: string;
    readonly verdict: "pass" | "fail";
    readonly reasons: readonly string[];
    readonly baseline: RunSummary;
    readonly rewrite: RunSummary;
    readonly shuffled: RunSummary | null;
    readonly assertions: {
        readonly before: number;
        readonly after: number;
    };
    readonly timeGain: boolean | null;
    readonly coverage: CoverageCheck | null;
};
export declare function lostCoverage(before: ReadonlySet<string>, after: ReadonlySet<string>, testFile: string): string[];
export declare function median(values: readonly number[]): number;
export declare function timeGainHolds(baseline: RunSummary, rewrite: RunSummary): boolean;
export declare function judge(input: {
    readonly baseline: RunSummary;
    readonly rewrite: RunSummary;
    readonly shuffled: RunSummary | null;
    readonly assertions: {
        readonly before: number;
        readonly after: number;
    };
    readonly claim: Claim;
}): string[];
export declare function verifyRewrite(options: VerifyOptions): VerifyReport;
