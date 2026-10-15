export declare const STALE_SKIP_MS: number;
export type SourceFile = {
    readonly path: string;
    readonly source: string;
};
export type ScannedTest = {
    readonly file: string;
    readonly line: number;
    readonly name: string;
    readonly skipped: boolean;
    readonly todo: boolean;
    readonly parameterised: boolean;
    readonly assertionFree: boolean;
    readonly trivialAssertion: boolean;
    readonly sleepCall: boolean;
    readonly lastChangedAt: number | null;
    readonly staleSkip: boolean;
    readonly exactKey: string | null;
    readonly maskedKey: string | null;
};
export type TestGroup = {
    readonly key: string;
    readonly tests: readonly ScannedTest[];
};
export type ScanReport = {
    readonly testFiles: number;
    readonly tests: number;
    readonly assertionFree: readonly ScannedTest[];
    readonly trivialAssertion: readonly ScannedTest[];
    readonly skipped: readonly ScannedTest[];
    readonly duplicates: readonly TestGroup[];
    readonly parameterisable: readonly TestGroup[];
    readonly sleepTests: readonly ScannedTest[];
};
export type ScanOptions = {
    readonly now: number;
    readonly lastChangedAt: (file: string) => number | null;
};
export declare function maskLiterals(body: string): string;
export declare function scanTests(files: readonly SourceFile[], options: ScanOptions): ScanReport;
export declare function readSourceFiles(root: string): SourceFile[];
export declare function lastChangedAtFromGit(root: string): (file: string) => number | null;
