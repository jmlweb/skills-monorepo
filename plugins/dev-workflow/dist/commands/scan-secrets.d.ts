export type FindingReason = "sensitive-filename" | "secret-pattern";
export type Finding = {
    file: string;
    reason: FindingReason;
    pattern: string;
    line?: number;
    preview?: string;
};
export type ScanResult = {
    findings: Finding[];
};
export declare function scanFilenames(files: readonly string[]): Finding[];
export declare function scanDiff(diff: string): Finding[];
export declare function scanSecrets(files: readonly string[], diff: string): ScanResult;
